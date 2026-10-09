import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const native = fs.readFileSync(new URL('../android/JulieUpdateManager.java', import.meta.url),'utf8');
const receiver = fs.readFileSync(new URL('../android/JulieInstallReceiver.java', import.meta.url),'utf8');
const manifest = fs.readFileSync(new URL('../android/AndroidManifest.xml', import.meta.url),'utf8');
const main = fs.readFileSync(new URL('../android/MainActivity.java', import.meta.url),'utf8');
const js = fs.readFileSync(new URL('../www/app.mjs',import.meta.url),'utf8');
const html = fs.readFileSync(new URL('../www/index.html',import.meta.url),'utf8');

test('mises à jour : URL propre au projet et APK unique',()=>{
  assert.match(native,/api\.github\.com\/repos\/amaurygiboudot-arch\/Listingcase\/releases\/tags\//);
  assert.match(native,/static final String RELEASE_TAG = "julie-android-updates"/);
  assert.match(native,/static final String APK_ASSET = "JULIE-Android\.apk"/);
  assert.match(native,/!APK_URL\.equals\(asset\.optString\("browser_download_url"\)\)/);
  assert.match(native,/new JSONObject\(release\.getString\("body"\)\)/);
  assert.match(native,/code<=installedVersion\(\)/);
});
test('APK contrôlée par empreinte, taille, package et signature',()=>{
  for(const needle of [
    'SHA-256', 'sha.matches("[0-9a-f]{64}")', 'MessageDigest.getInstance("SHA-256")',
    'digest.toString().equals(info.sha256)', 'PackageManager.GET_SIGNING_CERTIFICATES',
    'getPackageArchiveInfo', 'Arrays.equals(original.toByteArray(),incoming.toByteArray())',
    'count!=info.length', 'activity.getPackageName().equals(candidate.packageName)'
  ])assert.ok(native.includes(needle),'Vérification absente : '+needle);
  assert.match(native,/getCacheDir\(\)/);
});
test('pas de silent install : PackageInstaller et consentement Android',()=>{
  assert.match(native,/@JavascriptInterface public void installUpdate\(\)/);
  assert.match(native,/canRequestPackageInstalls\(\)/);
  assert.match(native,/Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES/);
  assert.match(native,/PackageInstaller\.SessionParams\.MODE_FULL_INSTALL/);
  assert.match(receiver,/STATUS_PENDING_USER_ACTION/);
  assert.match(receiver,/context\.startActivity\(confirm\)/);
  assert.match(manifest,/REQUEST_INSTALL_PACKAGES/);
});
test('téléchargement automatique seulement sans frais réseau et sur demande utilisateur',()=>{
  assert.match(native,/NET_CAPABILITY_NOT_METERED/);
  assert.match(native,/CHECK_EVERY = 24L/);
  assert.match(native,/if\(!manual&&!isUnmetered\(\)\)/);
  assert.match(native,/automaticDownloadsEnabled\(\)/);
  assert.match(js,/if\(confirm\('Installer cette mise à jour \?/);
  assert.match(html,/id="auto-updates"/);
  assert.match(html,/id="update-install"/);
  assert.match(html,/id="update-download"/);
});
test('le WebView reste local, la mémoire existante demeure intacte',()=>{
  assert.match(main,/shouldInterceptRequest/);
  assert.match(main,/return serveLocalResource\(request\.getUrl\(\)\)/);
  assert.match(main,/new JulieUpdateManager\(this,web\)/);
  assert.match(main,/new JulieSecureStore\(getApplicationContext\(\)\)/);
  assert.match(manifest,/allowBackup="false"/);
  assert.match(manifest,/android:exported="false"/);
  assert.doesNotMatch(js,/\.innerHTML.*event\.message/);
});
