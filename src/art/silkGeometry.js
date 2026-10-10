const unit=v=>{const length=Math.hypot(...v)||1;return v.map(x=>x/length);};

/** Cubic handles leave each physical edge along the local wrap, without overshooting short gaps. */
export function connectThread(a,b,outA,outB){
  const distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const reach=Math.min(180,distance*.34);
  const ta=unit(outA),tb=unit(outB);
  // Foreshortened edges need short handles to avoid a loop during the flip.
  const reachA=Math.min(reach,8+Math.hypot(...outA)*16);
  const reachB=Math.min(reach,8+Math.hypot(...outB)*16);
  return [a,a.map((v,k)=>v+ta[k]*reachA),b.map((v,k)=>v+tb[k]*reachB),b];
}

/** Normal offsets taper to zero at a tied end, so the halo cannot look like a loose second strand. */
export function fibreOffset(distance,length,time,side){
  const envelope=Math.min(1,distance/28,(length-distance)/28);
  return side*(2.4+Math.sin(distance*.024-time*.8)*1.6)*Math.max(0,envelope);
}
