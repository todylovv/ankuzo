const dots=[1,8,2,16,4,32,64,128];
const thresholds=[.10,.58,.82,.34,.46,.94,.70,.22];
/** A 2 x 4 pixel cell maps directly to Unicode braille; transparent pixels never draw. */
export function encodeCell(data,width,x,y) {
  let code=0,red=0,green=0,blue=0,weight=0;
  for(let i=0;i<8;i++){
    const offset=((y+Math.floor(i/2))*width+x+i%2)*4;
    const r=data[offset]/255,g=data[offset+1]/255,b=data[offset+2]/255,a=data[offset+3]/255;
    if(a<.22)continue;
    const hair=r>g*1.3 && r>b*1.12;
    const light=hair?r*.94:(r*.2126+g*.7152+b*.0722);
    if(light*a>thresholds[i])code|=dots[i];
    red+=r*a;green+=g*a;blue+=b*a;weight+=a;
  }
  return {code,hair:red>green*1.3&&red>blue*1.12,brightness:weight?(red*.2126+green*.7152+blue*.0722)/weight:0};
}
export function assemble(seconds,row,seed) {
  const delay=.12+(row/64)*.65+seed*.48;
  const t=Math.max(0,Math.min(1,(seconds-delay)/1.35));
  return 1-(1-t)**3;
}
