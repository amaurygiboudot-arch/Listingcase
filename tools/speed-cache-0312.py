from pathlib import Path
r=Path(r'C:\Dev\JULIE\learning-integration-20261011')
p=r/'julie-v3-genesis/android/julie_engine.cpp'
s=p.read_text(encoding='utf-8')
assert 'julie_prefix_cache.h' not in s
s=s.replace('#include "llama.h"','#include "llama.h"\n#include "julie_prefix_cache.h"')
s=s.replace('static std::string loaded_path;', '''static std::unique_ptr<llama_context,decltype(&llama_free)> ctx(nullptr,llama_free);
static std::vector<llama_token> cached_prompt;
static std::string loaded_path;
static void clear_context() { cached_prompt.clear();ctx.reset(); }''')
s=s.replace('lock(engine_mutex);model.reset();','lock(engine_mutex);clear_context();model.reset();')
s=s.replace('if(!model || loaded_path!=filename) {','if(!model || loaded_path!=filename) {\n            clear_context();')
s=s.replace('std::unique_ptr<llama_context,decltype(&llama_free)> ctx(llama_init_from_model(model.get(),cp),llama_free);','if(!ctx)ctx.reset(llama_init_from_model(model.get(),cp));')
s=s.replace('batch_tokens(batch.get(),tokens.data(),n,0);', '''// Keep only token-identical prefix; discard old answer and changed history.
        auto reused=reusable_prefix(cached_prompt,tokens);
        auto memory=llama_get_memory(ctx.get());
        if(!llama_memory_seq_rm(memory,0,static_cast<llama_pos>(reused),-1)) {
            llama_memory_clear(memory,true);reused=0;
        }
        batch_tokens(batch.get(),tokens.data()+reused,n-reused,reused);''')
s=s.replace('auto token=llama_sampler_sample', 'if(i==0)cached_prompt=tokens;\n            auto token=llama_sampler_sample')
s=s.replace('if(i==0 || i%4==0) {','const auto visible=utf8_complete_prefix(output);\n            if(visible>0) {')
s=s.replace('auto update=env->NewByteArray(output.size());','auto update=env->NewByteArray(visible);')
s=s.replace('env->SetByteArrayRegion(update,0,output.size(),','env->SetByteArrayRegion(update,0,visible,')
s=s.replace('} catch(const std::exception& e) {','} catch(const std::exception& e) {\n        clear_context();')
p.write_text(s,encoding='utf-8')
p=r/'julie-v3-genesis/www/index.html'
s=p.read_text(encoding='utf-8').replace('0.3.11','0.3.12')
p.write_text(s,encoding='utf-8')
b=Path(r'C:\Dev\JULIE\learning-build-20261011\android')
p=b/'app/build.gradle'
s=p.read_text().replace('300007','300008').replace('0.3.11-3b-optimise-test','0.3.12-3b-fluide-test')
p.write_text(s)
print('Native context reuse and immediate UTF-8 streaming applied; version 0.3.12')
