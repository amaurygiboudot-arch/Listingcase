#pragma once
#include <algorithm>
#include <cstddef>
#include <string>
#include <vector>
// Always decode the final prompt token again to obtain fresh logits.
template<class T> std::size_t reusable_prefix(const std::vector<T>& cached,const std::vector<T>& prompt) {
    if(prompt.empty())return 0;
    const auto limit=std::min(cached.size(),prompt.size()-1);
    std::size_t n=0;while(n<limit&&cached[n]==prompt[n])++n;return n;
}
// Do not publish a partial UTF-8 code point between token callbacks.
inline std::size_t utf8_complete_prefix(const std::string& text) {
    if(text.empty())return 0;
    std::size_t start=text.size()-1;
    while(start>0&&(static_cast<unsigned char>(text[start])&0xc0)==0x80)--start;
    const auto c=static_cast<unsigned char>(text[start]);
    const std::size_t width=c<0x80?1:(c&0xe0)==0xc0?2:(c&0xf0)==0xe0?3:(c&0xf8)==0xf0?4:1;
    return text.size()-start<width?start:text.size();
}
