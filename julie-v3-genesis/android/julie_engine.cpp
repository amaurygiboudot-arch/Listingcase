#include "llama.h"
#include <jni.h>
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <chrono>

static std::mutex engine_mutex;
static std::once_flag init_flag;
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
Java_com_humanpartner_JulieLocalEngine_infer(JNIEnv* env,jclass,jbyteArray path,jbyteArray input) {
    std::lock_guard<std::mutex> lock(engine_mutex);
    try {
        std::call_once(init_flag,[]{llama_log_set([](ggml_log_level,const char*,void*){},nullptr);llama_backend_init();});
        auto filename=from_bytes(env,path),prompt=from_bytes(env,input);
        auto mp=llama_model_default_params();mp.n_gpu_layers=0;
        std::unique_ptr<llama_model,decltype(&llama_model_free)> model(
            llama_model_load_from_file(filename.c_str(),mp),llama_model_free);
        if(!model)throw std::runtime_error("Chargement du modele impossible");
        const auto* vocab=llama_model_get_vocab(model.get());
        int n=-llama_tokenize(vocab,prompt.data(),prompt.size(),nullptr,0,true,true);
        if(n<=0||n>1400)throw std::runtime_error("Contexte trop long : raccourcis ton message");
        std::vector<llama_token> tokens(n);
        if(llama_tokenize(vocab,prompt.data(),prompt.size(),tokens.data(),n,true,true)<0)
            throw std::runtime_error("Tokenisation impossible");
        auto cp=llama_context_default_params();
        cp.n_ctx=2048;cp.n_batch=1536;cp.n_threads=4;cp.n_threads_batch=4;
        std::unique_ptr<llama_context,decltype(&llama_free)> ctx(llama_init_from_model(model.get(),cp),llama_free);
        if(!ctx)throw std::runtime_error("Memoire insuffisante pour le moteur");
        std::unique_ptr<llama_sampler,decltype(&llama_sampler_free)> sampler(
            llama_sampler_chain_init(llama_sampler_chain_default_params()),llama_sampler_free);
        llama_sampler_chain_add(sampler.get(),llama_sampler_init_greedy());
        std::unique_ptr<llama_batch_ext,decltype(&llama_batch_ext_free)> batch(
            llama_batch_ext_init(ctx.get()),llama_batch_ext_free);
        batch_tokens(batch.get(),tokens.data(),n,0);
        int pos=n; std::string output; bool complete=false;
        const auto start=std::chrono::steady_clock::now();
        for(int i=0;i<384;i++) {
            if(std::chrono::steady_clock::now()-start>std::chrono::seconds(90))
                throw std::runtime_error("Temps de reponse depasse");
            if(llama_process(ctx.get(),LLAMA_PROCESS_TYPE_DECODE,batch.get()))
                throw std::runtime_error("Erreur de generation");
            auto token=llama_sampler_sample(sampler.get(),ctx.get(),-1);
            if(llama_vocab_is_eog(vocab,token)){complete=true;break;}
            std::vector<char> piece(256);
            int count=llama_token_to_piece(vocab,token,piece.data(),piece.size(),0,false);
            if(count<0){piece.resize(-count);count=llama_token_to_piece(vocab,token,piece.data(),piece.size(),0,false);}
            if(count<0)throw std::runtime_error("Conversion de texte impossible");
            output.append(piece.data(),count);
            batch_tokens(batch.get(),&token,1,pos++);
        }
        if(!complete)output+="\n[Reponse interrompue : limite de longueur atteinte.]";
        if(output.empty())throw std::runtime_error("Reponse vide");
        auto result=env->NewByteArray(output.size());
        if(result)env->SetByteArrayRegion(result,0,output.size(),reinterpret_cast<const jbyte*>(output.data()));
        return result;
    } catch(const std::exception& e) {
        env->ThrowNew(env->FindClass("java/lang/IllegalStateException"),e.what());
        return nullptr;
    }
}
