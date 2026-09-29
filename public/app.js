const app = document.getElementById("app");
let questions=[], current=0, selected=null, score=0, mode="login";

const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(url, options={}) {
  const r=await fetch(url,{headers:{"Content-Type":"application/json"},...options});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Қате");
  return data;
}
function nav(user){
  return `<div class="nav"><div class="logo">QuizPro</div><div>${user?`<span>${esc(user.name)}</span> <button class="button secondary" onclick="logout()">Шығу</button>`:""}</div></div>`;
}
function authPage(type="login"){
  mode=type;
  app.innerHTML=`<div class="auth card">
    <h2>${type==="login"?"QuizPro-ға кіру":"Тіркелу"}</h2>
    <p class="muted">${type==="login"?"Тестке қатысу үшін аккаунтыңызға кіріңіз.":"Өз рейтингіңізді сақтау үшін аккаунт жасаңыз."}</p>
    <div id="msg"></div>
    ${type==="register"?`<label>Аты-жөніңіз</label><input id="name" class="input" placeholder="Малика Кусаинова">`:""}
    <label>Email</label><input id="email" class="input" type="email" placeholder="student@example.com">
    <label>Пароль</label><input id="password" class="input" type="password" placeholder="••••••••">
    <button class="button" style="width:100%" onclick="${type==="login"?"login()":"register()"}">${type==="login"?"Кіру":"Тіркелу"}</button>
    <p class="muted" style="text-align:center;margin-top:20px">${type==="login"?"Аккаунтыңыз жоқ па?":"Аккаунтыңыз бар ма?"} <a href="#" onclick="authPage('${type==="login"?"register":"login"}');return false">${type==="login"?"Тіркелу":"Кіру"}</a></p>
  </div>`;
}
async function login(){
  try{
    const emailInput=document.getElementById("email");
    const passwordInput=document.getElementById("password");
    const message=document.getElementById("msg");
    const d=await api("/api/login",{
      method:"POST",
      body:JSON.stringify({
        email:emailInput.value.trim(),
        password:passwordInput.value
      })
    });
    sessionStorage.setItem("quizUser",JSON.stringify(d.user));
    home(d.user);
  }catch(e){
    const message=document.getElementById("msg");
    if(message) message.innerHTML=`<div class="error">${esc(e.message)}</div>`;
  }
}
async function register(){
  try{
    const nameInput=document.getElementById("name");
    const emailInput=document.getElementById("email");
    const passwordInput=document.getElementById("password");
    const message=document.getElementById("msg");
    const d=await api("/api/register",{
      method:"POST",
      body:JSON.stringify({
        name:nameInput.value.trim(),
        email:emailInput.value.trim(),
        password:passwordInput.value
      })
    });
    sessionStorage.setItem("quizUser",JSON.stringify(d.user));
    home(d.user);
  }catch(e){
    const message=document.getElementById("msg");
    if(message) message.innerHTML=`<div class="error">${esc(e.message)}</div>`;
  }
}
async function logout(){
  await api("/api/logout",{method:"POST"});
  sessionStorage.removeItem("quizUser");
  authPage("login");
}
function home(user){
  app.innerHTML=nav(user)+`<main class="container">
    <section class="hero"><h1>Қазақ мәдениеті</h1><p>25 сұрақ. Әр дұрыс жауапқа 1 ұпай. Соңында жалпы рейтингтен өз орныңызды көресіз.</p><button class="button" onclick="startQuiz()">Тестті бастау</button></section>
    <div class="grid">
      <div class="card"><h2>25 сұрақ</h2><p class="muted">Мәдениет, дәстүр, құндылықтар және мәдени код.</p></div>
      <div class="card"><h2>Жалпы рейтинг</h2><p class="muted">Барлық қатысушылардың нәтижелері ортақ рейтингте сақталады.</p><button class="button secondary" onclick="leaderboard()">Рейтингті көру</button></div>
    </div>
  </main>`;
}
async function startQuiz(){
  questions=await api("/api/questions");current=0;score=0;selected=null;renderQuestion();
}
function renderQuestion(){
  const q=questions[current];
  app.innerHTML=nav({name:"Тест қатысушысы"})+`<main class="container"><div class="card">
    <div class="question-number">${current+1} / ${questions.length}</div>
    <div class="progress"><div style="width:${((current)/questions.length)*100}%"></div></div>
    <h1 class="question">${esc(q.question)}</h1>
    ${q.options.map((x,i)=>`<button class="option ${selected===i?"selected":""}" onclick="selectOption(${i})"><b>${"АБВС"[i]}.</b> ${esc(x)}</button>`).join("")}
    <div style="display:flex;justify-content:flex-end;margin-top:20px"><button class="button" onclick="nextQuestion()">${current===questions.length-1?"Аяқтау":"Келесі"}</button></div>
  </div></main>`;
}
function selectOption(i){selected=i;document.querySelectorAll(".option").forEach((x,n)=>x.classList.toggle("selected",n===i))}
function nextQuestion(){
  if(selected===null){alert("Жауапты таңдаңыз");return}
  if(selected===questions[current][2])score++;
  if(current<questions.length-1){current++;selected=null;renderQuestion()}else finish();
}
async function finish(){
  await api("/api/results",{method:"POST",body:JSON.stringify({score})});
  const board=await api("/api/leaderboard");
  const currentUser=JSON.parse(sessionStorage.getItem("quizUser")||"null");
  const myRank=board.findIndex(x=>x.name===currentUser?.name && x.score===score)+1;
  showResult(board,myRank);
}
function showResult(board,myRank){
  app.innerHTML=`<main class="container"><div class="card" style="max-width:720px;margin:auto">
    <div class="score">${score}/25</div><div class="rank">Тест аяқталды!</div>
    <p style="text-align:center" class="muted">Нәтижеңіз жалпы рейтингке қосылды.</p>
    <h2>🏆 Top 3</h2>
    ${board.slice(0,3).map((x,i)=>`<div class="leader-row top"><div class="place">${i+1}</div><div><b>${esc(x.name)}</b></div><strong>${x.score}/25</strong></div>`).join("")}
    <div style="display:flex;gap:10px;margin-top:25px"><button class="button" onclick="location.reload()">Басты бет</button><button class="button secondary" onclick="leaderboard()">Толық рейтинг</button></div>
  </div></main>`;
}
async function leaderboard(){
  const b=await api("/api/leaderboard");
  app.innerHTML=nav(null)+`<main class="container"><div class="card"><h1>Жалпы рейтинг</h1><p class="muted">Ең жоғары нәтижелер.</p>
  ${b.length?b.map((x,i)=>`<div class="leader-row ${i<3?"top":""}"><div class="place">${i+1}</div><div><b>${esc(x.name)}</b></div><strong>${x.score}/25</strong></div>`).join(""):"<p class='muted'>Әзірге нәтиже жоқ.</p>"}
  <button class="button" style="margin-top:20px" onclick="authPage('login')">Кіру</button></div></main>`;
}
(async()=>{
  try{const d=await api("/api/me"); if(d.user){sessionStorage.setItem("quizUser",JSON.stringify(d.user));home(d.user)}else authPage("login")}
  catch{authPage("login")}
})();