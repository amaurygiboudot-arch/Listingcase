import test from "node:test";
import assert from "node:assert/strict";
import {qualityRetryHint} from "../lib/visual-quality.js";

test("le correcteur qualité transforme les défauts en consignes utiles",()=>{
  const hint=qualityRetryHint({reasons:["face_distorted","limbs_invalid","hands_distorted","scene_mismatch"]});
  assert.match(hint,/undistorted face/);
  assert.match(hint,/two arms and two legs/);
  assert.match(hint,/correct fingers/);
  assert.match(hint,/requested scene/);
});
