import{c as p}from"./index-Bff8kboh.js";/**
 * @license lucide-vue-next v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=p("download",[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]]);function b(t,a){if(t.length===0)return;const o=Object.keys(t[0]),r=o.join(","),d=t.map(l=>o.map(h=>{const n=String(l[h]??"");return/[",\n]/.test(n)?`"${n.replace(/"/g,'""')}"`:n}).join(",")),s="\uFEFF"+[r,...d].join(`
`),i=new Blob([s],{type:"text/csv;charset=utf-8;"}),c=URL.createObjectURL(i),e=document.createElement("a");e.href=c,e.download=`${a}.csv`,document.body.appendChild(e),e.click(),document.body.removeChild(e),URL.revokeObjectURL(c)}export{u as D,b as e};
