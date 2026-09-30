(function(){
  var overlay=document.getElementById("wordOverlay");
  var wordCard=document.querySelector(".word-card");
  var speakBtn=document.getElementById("speakBtn");
  var bigWord=document.getElementById("bigWord");
  if(!overlay||!wordCard||!speakBtn||!bigWord)return;

  var PAUSE_MS=1300;
  var playToken=0;

  var files={
    "ЯБЛОКО":"apple","БАНАН":"banana","ГРУША":"pear","АПЕЛЬСИН":"orange",
    "КОТ":"cat","СОБАКА":"dog","ЗАЯЦ":"hare","МЕДВЕДЬ":"bear",
    "МАШИНА":"car","АВТОБУС":"bus","ПОЕЗД":"train","САМОЛЁТ":"plane",
    "ХЛЕБ":"bread","СЫР":"cheese","ЯЙЦО":"egg","МОРКОВЬ":"carrot",
    "СОЛНЦЕ":"sun","ОБЛАКО":"cloud","ДЕРЕВО":"tree","ЦВЕТОК":"flower",
    "ФУТБОЛКА":"tshirt","БРЮКИ":"trousers","НОСКИ":"socks","БОТИНКИ":"shoes",
    "КРОВАТЬ":"bed","СТУЛ":"chair","ДВЕРЬ":"door","ЛАМПА":"lamp",
    "ГЛАЗ":"eye","УХО":"ear","НОС":"nose","РУКА":"hand",
    "МИШКА":"teddy","МЯЧ":"ball","ШАРИК":"balloon","БАРАБАН":"drum"
  };

  speakBtn.textContent="🔊  ЕЩЁ РАЗ";
  speakBtn.setAttribute("aria-label","Повторить слово");
  overlay.appendChild(speakBtn);

  var synth=("speechSynthesis" in window)?window.speechSynthesis:null;
  var nativeSpeak=synth?synth.speak.bind(synth):null;
  var nativeCancel=synth?synth.cancel.bind(synth):null;
  var unavailable={};

  function chooseVoice(){
    if(!synth||!synth.getVoices)return null;
    var voices=synth.getVoices(),best=null,bestScore=-1,i,v,n,score;
    for(i=0;i<voices.length;i++){
      v=voices[i];
      if(((v.lang||"").toLowerCase()).indexOf("ru")!==0)continue;
      n=(v.name||"").toLowerCase();
      score=10;
      if(n.indexOf("alice")>=0||n.indexOf("алиса")>=0)score+=500;
      if(n.indexOf("yandex")>=0)score+=300;
      if(n.indexOf("alena")>=0||n.indexOf("алена")>=0)score+=250;
      if(n.indexOf("google")>=0)score+=180;
      if(n.indexOf("microsoft")>=0)score+=140;
      if(n.indexOf("female")>=0)score+=20;
      if(score>bestScore){best=v;bestScore=score}
    }
    return best;
  }

  function speakSystem(word,token){
    if(!synth||!nativeSpeak)return;
    if(nativeCancel)nativeCancel();
    var count=0;
    function one(){
      if(token!==playToken||count>=3)return;
      var u=new SpeechSynthesisUtterance(word.toLowerCase());
      u.lang="ru-RU";
      u.rate=.82;
      u.pitch=1.02;
      var v=chooseVoice();
      if(v)u.voice=v;
      u.onend=function(){
        count++;
        if(count<3&&token===playToken){
          window.setTimeout(one,PAUSE_MS);
        }
      };
      nativeSpeak(u);
    }
    one();
  }

  function speakAudio(word,slug,token){
    var count=0;
    var audio=null;
    var fellBack=false;

    function fallback(){
      if(fellBack)return;
      fellBack=true;
      unavailable[slug]=true;
      speakSystem(word,token);
    }

    function one(){
      if(token!==playToken||count>=3)return;
      audio=new Audio("audio/"+slug+".ogg");
      audio.preload="auto";
      audio.onended=function(){
        count++;
        if(count<3&&token===playToken){
          window.setTimeout(one,PAUSE_MS);
        }
      };
      audio.onerror=fallback;
      var p=audio.play();
      if(p&&p.catch)p.catch(fallback);
    }
    one();
  }

  function speakThree(word){
    playToken++;
    var token=playToken;
    if(nativeCancel)nativeCancel();
    var slug=files[word];
    if(slug&&!unavailable[slug])speakAudio(word,slug,token);
    else speakSystem(word,token);
  }

  if(synth){
    synth.speak=function(u){
      if(!u||!u.text)return;
      var word=String(u.text).replace(/[.!?]+$/,"").trim().toUpperCase();
      speakThree(word);
    };
  }

  speakBtn.addEventListener("click",function(e){
    e.stopPropagation();
    e.preventDefault();
    speakThree((bigWord.textContent||"").trim().toUpperCase());
  },true);

  speakBtn.addEventListener("touchstart",function(e){
    e.stopPropagation();
    e.preventDefault();
    speakThree((bigWord.textContent||"").trim().toUpperCase());
  },{passive:false,capture:true});
})();