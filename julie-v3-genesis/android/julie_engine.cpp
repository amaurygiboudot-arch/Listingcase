#include "llama.h"
#include "julie_prefix_cache.h"
#include <jni.h>
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <chrono>

static std::mutex engine_mutex;
static std::once_flag init_flag;
static std::unique_ptr<llama_model,decltype(&llama_model_free)> model(nullptr,llama_model_free);
static std::unique_ptr<llama_context,decltype(&llama_free)> ctx(nullptr,llama_free);
static std::vector<llama_token> cached_prompt;
static std::string loaded_path;
static void clear_context() { cached_prompt.clear();ctx.reset(); }
extern "C" JNIEXPORT void JNICALL Java_com_humanpartner_JulieLocalEngine_release(JNIEnv*,jclass) {
    std::lock_guard<std::mutex> lock(engine_mutex);clear_context();model.reset();loaded_path.clear();
}
static std::string from_bytes(JNIEnv* env,jbyteArray a) {
    if(!a)throw std::runtime_error("Argument absent");
    std::string s(env->GetArrayLength(a),'\0');
    env->GetByteArrayRegion(a,0,s.size(),reinterpret_cast<jbyte*>(&s[0]));
    return s;
}
static void batch_tokens(llama_batch_ext* b,const llama_token* t,int n,int pos) {
    llama_batch_ext_clear(b);
    for(int i=0;i<n;i++) {
        int idx=llama_batch_ext_add_token(b,0,t[i]);
        llama_pos p=pos+i; llama_batch_ext_set_pos(b,idx,&p);
    }
    llama_batch_ext_set_output_logits(b,n-1,true);
}
extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_humanpartner_JulieLocalEngine_infer(JNIEnv* env,jclass,jbyteArray path,jbyteArray input,jobject sink) {
    std::lock_guard<std::mutex> lock(engine_mutex);
    try {
        std::call_once(init_flag,[]{llama_log_set([](ggml_log_level,const char*,void*){},nullptr);llama_backend_init();});
        auto filename=from_bytes(env,path),prompt=from_bytes(env,input);
        auto mp=llama_model_default_params();mp.n_gpu_layers=0;
        if(!model || loaded_path!=filename) {
            clear_context();
            model.reset(llama_model_load_from_file(filename.c_str(),mp));
            loaded_path=filename;
        }
        jmethodID progress=env->GetMethodID(env->GetObjectClass(sink),"progress","([B)Z");
        if(!progress)throw std::runtime_error("Progress callback unavailable");
        if(!model)throw std::runtime_error("Chargement du modele impossible");
        const auto* vocab=llama_model_get_vocab(model.get());
        int n=-llama_tokenize(vocab,prompt.data(),prompt.size(),nullptr,0,true,true);
        if(n<=0||n>1400)throw std::runtime_error("Contexte trop long : raccourcis ton message");
        std::vector<llama_token> tokens(n);
        if(llama_tokenize(vocab,prompt.data(),prompt.size(),tokens.data(),n,true,true)<0)
            throw std::runtime_error("Tokenisation impossible");
        auto cp=llama_context_default_params();
        cp.n_ctx=2048;cp.n_batch=1536;cp.n_threads=4;cp.n_threads_batch=4;
        if(!ctx)ctx.reset(llama_init_from_model(model.get(),cp));
        if(!ctx)throw std::runtime_error("Memoire insuffisante pour le moteur");
        std::unique_ptr<llama_sampler,decltype(&llama_sampler_free)> sampler(
            llama_sampler_chain_init(llama_sampler_chain_default_params()),llama_sampler_free);
        llama_sampler_chain_add(sampler.get(),llama_sampler_init_greedy());
        std::unique_ptr<llama_batch_ext,decltype(&llama_batch_ext_free)> batch(
            llama_batch_ext_init(ctx.get()),llama_batch_ext_free);
        // Keep only token-identical prefix; discard old answer and changed history.
        auto reused=reusable_prefix(cached_prompt,tokens);
        auto memory=llama_get_memory(ctx.get());
        if(!llama_memory_seq_rm(memory,0,static_cast<llama_pos>(reused),-1)) {
            llama_memory_clear(memory,true);reused=0;
        }
        batch_tokens(batch.get(),tokens.data()+reused,n-reused,reused);
        int pos=n; std::string output; bool complete=false;
        const auto start=std::chrono::steady_clock::now();
        for(int i=0;i<384;i++) {
            if(std::chrono::steady_clock::now()-start>std::chrono::seconds(90))
                throw std::runtime_error("Temps de reponse depasse");
            if(llama_process(ctx.get(),LLAMA_PROCESS_TYPE_DECODE,batch.get()))
                throw std::runtime_error("Erreur de generation");
            if(i==0)cached_prompt=tokens;
            auto token=llama_sampler_sample(sampler.get(),ctx.get(),-1);
            if(llama_vocab_is_eog(vocab,token)){complete=true;break;}
            std::vector<char> piece(256);
            int count=llama_token_to_piece(vocab,token,piece.data(),piece.size(),0,false);
            if(count<0){piece.resize(-count);count=llama_token_to_piece(vocab,token,piece.data(),piece.size(),0,false);}
            if(count<0)throw std::runtime_error("Conversion de texte impossible");
            output.append(piece.data(),count);
            const auto visible=utf8_complete_prefix(output);
            if(visible>0) {
                auto update=env->NewByteArray(visible);
                if(!update)throw std::runtime_error("Memoire insuffisante");
                env->SetByteArrayRegion(update,0,visible,reinterpret_cast<const jbyte*>(output.data()));
                bool keep=env->CallBooleanMethod(sink,progress,update);
                env->DeleteLocalRef(update);
                if(env->ExceptionCheck()||!keep)throw std::runtime_error("Generation annulee");
            }
            batch_tokens(batch.get(),&token,1,pos++);
        }
        if(!complete)output+="\n[Reponse interrompue : limite de longueur atteinte.]";
        if(output.empty())throw std::runtime_error("Reponse vide");
        auto result=env->NewByteArray(output.size());
        if(result)env->SetByteArrayRegion(result,0,output.size(),reinterpret_cast<const jbyte*>(output.data()));
        return result;
    } catch(const std::exception& e) {
        clear_context();
        if(!env->ExceptionCheck())env->ThrowNew(env->FindClass("java/lang/IllegalStateException"),e.what());
        return nullptr;
    }
}
