import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("le workflow ComfyUI injecte réellement la photo canonique",()=>{
  const graph=JSON.parse(fs.readFileSync("config/comfyui-tiny-sd.json","utf8"));
  const entries=Object.entries(graph);
  const load=entries.find(([,n])=>n.class_type==="LoadImage");
  const scale=entries.find(([,n])=>n.class_type==="ImageScale");
  const encode=entries.find(([,n])=>n.class_type==="VAEEncode");
  const sampler=entries.find(([,n])=>n.class_type==="KSampler");
  assert.ok(load);
  assert.equal(load[1].inputs.image,"{{REFERENCE_IMAGE}}");
  assert.ok(scale);
  assert.deepEqual(scale[1].inputs.image,[load[0],0]);
  assert.ok(encode);
  assert.deepEqual(encode[1].inputs.pixels,[scale[0],0]);
  assert.ok(sampler);
  assert.deepEqual(sampler[1].inputs.latent_image,[encode[0],0]);
  assert.ok(sampler[1].inputs.denoise>0&&sampler[1].inputs.denoise<1);
});
