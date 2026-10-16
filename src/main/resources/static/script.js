const api="/api/attendance";
const $=id=>document.getElementById(id);
$("date").value=new Date().toLocaleDateString("en-CA");

async function load(){
 try{
  const r=await fetch(api);
  if(!r.ok)throw Error("Unable to load records");
  const data=await r.json(), body=$("records");
  body.replaceChildren();
  data.forEach(a=>{
   const tr=document.createElement("tr");
   [a.studentName,a.rollNumber,a.attendanceDate,a.status].forEach(v=>{
    const td=document.createElement("td");td.textContent=v??"";tr.appendChild(td);
   });
   const td=document.createElement("td"),b=document.createElement("button");
   b.textContent="Delete";
   b.onclick=async()=>{
    const r=await fetch(api+"/"+a.id,{method:"DELETE"});
    if(r.ok)load();else $("message").textContent="Delete failed";
   };
   td.appendChild(b);tr.appendChild(td);body.appendChild(tr);
  });
 }catch(e){$("message").textContent=e.message;}
}
$("form").onsubmit=async e=>{
 e.preventDefault();
 try{
  const r=await fetch(api,{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({studentName:$("name").value.trim(),rollNumber:$("roll").value.trim(),attendanceDate:$("date").value,status:$("status").value})});
  if(!r.ok)throw Error("Save failed");
  $("message").textContent="Attendance saved!";
  $("form").reset();$("date").value=new Date().toLocaleDateString("en-CA");load();
 }catch(err){$("message").textContent=err.message;}
};
$("refresh").onclick=load;
load();
