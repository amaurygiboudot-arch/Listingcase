import com.humanpartner.JulieModelFiles;
import java.io.*;
import java.nio.file.*;
import java.util.Arrays;
public class ModelFilesTest {
 public static void main(String[] args)throws Exception{
  Path dir=Files.createTempDirectory("julie-model-test");File target=dir.resolve("model.gguf").toFile();
  byte[] old={7,8,9};Files.write(target.toPath(),old);
  try{
   String hash="ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
   for(byte[] bad:new byte[][]{{1,2},{1,2,3},{1,2,3,4}}){
    boolean failed=false;try{JulieModelFiles.install(new ByteArrayInputStream(bad),target,3,hash,n->{});}catch(IOException e){failed=true;}
    if(!failed||!Arrays.equals(Files.readAllBytes(target.toPath()),old))throw new AssertionError("Existing model corrupted");
    if(Files.exists(dir.resolve("model.gguf.part")))throw new AssertionError("Partial file retained");
   }
   long[] count={0};JulieModelFiles.install(new ByteArrayInputStream("abc".getBytes("UTF-8")),target,3,hash,n->count[0]=n);
   if(count[0]!=3||!new String(Files.readAllBytes(target.toPath()),"UTF-8").equals("abc"))throw new AssertionError("Valid import failed");
   System.out.println("PASS: incomplete, invalid hash, oversized preserve old model; valid import atomic; partial cleaned; progress checked");
  }finally{Files.deleteIfExists(target.toPath());Files.deleteIfExists(dir.resolve("model.gguf.part"));Files.delete(dir);}
 }
}
