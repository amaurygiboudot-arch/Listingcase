#include "../android/julie_prefix_cache.h"
#include <cassert>
#include <iostream>
int main(){
 using V=std::vector<int>;
 assert(reusable_prefix(V{},V{1,2,3})==0);
 assert(reusable_prefix(V{1,2,3},V{1,2,3})==2);
 assert(reusable_prefix(V{1,2,3},V{1,2,4,5})==2);
 assert(reusable_prefix(V{1,2,3},V{1})==0);
 assert(reusable_prefix(V{1,2,3},V{4,2,3})==0);
 assert(reusable_prefix(V{1,2},V{1,2,3})==2);
 assert(reusable_prefix(V{1,2},V{})==0);
 for(const auto& text:std::vector<std::string>{"Bonjour",u8"désolée",u8"Ça va 😊",""}){
   for(std::size_t n=0;n<=text.size();++n){
     auto fragment=text.substr(0,n);auto end=utf8_complete_prefix(fragment);
     assert(end<=n);
     if(end<text.size()) assert((static_cast<unsigned char>(text[end])&0xc0)!=0x80);
     if(n==text.size())assert(end==n);
   }
 }
 std::cout<<"Prefix invalidation, final-logits replay, and UTF-8 boundaries passed\n";
}
