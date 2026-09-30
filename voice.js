(function(){
  var overlay=document.getElementById("wordOverlay");
  var speakBtn=document.getElementById("speakBtn");
  var bigWord=document.getElementById("bigWord");
  if(!overlay||!speakBtn||!bigWord)return;

  var PAUSE_MS=1300;
  var playToken=0;
  var synth=("speechSynthesis" in window)?window.speechSynthesis:null;
  var nativeSpeak=synth?synth.speak.bind(synth):null;
  var nativeCancel=synth?synth.cancel.bind(synth):null;

  speakBtn.textContent="🔊  ЕЩЁ РАЗ";
  speakBtn.setAttribute("aria-label","Повторить слово");
  overlay.appendChild(speakBtn);

  function chooseVoice(){
    if(!synth||!synth.getVoices)return null;
    var voices=synth.getVoices(),best=null,bestScore=-1,i,v,n,score;
    for(i=0;i<voices.length;i++){
      v=voices[i];
      if(((v.lang||"").toLowerCase()).indexOf("ru")!==0)continue;
      n=(v.name||"").toLowerCase();
      score=10;
      if(n.indexOf("google")>=0)score+=100;
      if(n.indexOf("yandex")>=0)score+=90;
      if(n.indexOf("microsoft")>=0)score+=80;
      if(n.indexOf("milena")>=0)score+=70;
      if(n.indexOf("female")>=0)score+=20;
      if(score>bestScore){best=v;bestScore=score}
    }
    return best;
  }

  function speakThree(word){
    if(!synth||!nativeSpeak)return;
    playToken++;
    var token=playToken;
    if(nativeCancel)nativeCancel();
    var count=0;

    function one(){
      if(token!==playToken||count>=3)return;
      var u=new SpeechSynthesisUtterance(word.toLowerCase());
      u.lang="ru-RU";
      u.rate=.78;
      u.pitch=1.03;
      var voice=chooseVoice();
      if(voice)u.voice=voice;
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