(function(){
  var board=document.getElementById("board");
  var again=document.getElementById("againBtn");
  var mastery=document.getElementById("masteryText");
  var done=document.getElementById("roundDone");
  var nextSet=document.getElementById("nextSetBtn");
  var speakBtn=document.getElementById("speakBtn");
  var bigEmoji=document.getElementById("bigEmoji");
  var bigWord=document.getElementById("bigWord");
  var wordCard=document.querySelector(".word-card");
  if(!board||!again||!mastery||!done||!nextSet)return;

  function mastered(){
    return mastery.textContent.replace(/\s/g,"")==="12/12";
  }

  /* Keep all 8 cards visible on phones and small tablets. */
  function fitBoard(){
    var cards=board.querySelectorAll(".card");
    if(!cards.length)return;
    var vw=window.innerWidth||document.documentElement.clientWidth||360;
    var vh=window.innerHeight||document.documentElement.clientHeight||640;
    var cols=(vw>=520||vw>vh)?4:2;
    var rows=Math.ceil(cards.length/cols);
    var gap=8;
    var rect=board.getBoundingClientRect();
    var availH=Math.max(180,vh-rect.top-10);
    var availW=board.clientWidth||vw-24;
    var size=Math.floor(Math.min(
      (availW-gap*(cols-1))/cols,
      (availH-gap*(rows-1))/rows
    ));
    size=Math.max(68,size);
    board.style.height=(size*rows+gap*(rows-1))+"px";
    board.style.alignContent="start";
    var i;
    for(i=0;i<cards.length;i++){
      cards[i].style.width=size+"px";
      cards[i].style.height=size+"px";
      cards[i].style.maxHeight="none";
      cards[i].style.flex="0 0 "+size+"px";
    }
  }

  window.addEventListener("resize",function(){window.setTimeout(fitBoard,60)});
  window.addEventListener("orientationchange",function(){window.setTimeout(fitBoard,250)});
  if(window.MutationObserver){
    new MutationObserver(function(){window.setTimeout(fitBoard,0)})
      .observe(board,{childList:true});
  }
  window.setTimeout(fitBoard,0);

  /* Put a large, easy repeat button directly under the emoji. */
  if(speakBtn&&bigEmoji&&bigWord&&wordCard){
    speakBtn.textContent="🔊  ЕЩЁ РАЗ";
    speakBtn.setAttribute("aria-label","Повторить слово");
    wordCard.insertBefore(speakBtn,bigWord);
  }

  /* Prefer the least robotic Russian voice that is installed on the device.
     Every pronunciation is spoken three times with punctuation pauses. */
  if("speechSynthesis" in window){
    try{
      var synth=window.speechSynthesis;
      var nativeSpeak=synth.speak.bind(synth);

      function bestRussianVoice(){
        var voices=synth.getVoices?synth.getVoices():[];
        var best=null,bestScore=-1,i,v,n,score;
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

      synth.speak=function(u){
        if(!u||!u.text)return nativeSpeak(u);
        var word=String(u.text).replace(/[.!?]+$/,"").trim();
        u.text=word+". "+word+". "+word+".";
        u.lang="ru-RU";
        u.rate=.78;
        u.pitch=1.03;
        var voice=bestRussianVoice();
        if(voice)u.voice=voice;
        return nativeSpeak(u);
      };
    }catch(e){}
  }

  /* No visible “next” button is required for the child.
     Repeat the same set automatically; after 3 clean successes per word,
     automatically open the next set. */
  var advanceTimer=null;
  function scheduleAdvance(){
    if(done.className.indexOf("show")<0)return;
    if(advanceTimer)window.clearTimeout(advanceTimer);
    advanceTimer=window.setTimeout(function(){
      if(mastered())nextSet.click();
      else again.click();
    },650);
  }

  if(window.MutationObserver){
    new MutationObserver(scheduleAdvance)
      .observe(done,{attributes:true,attributeFilter:["class"]});
  }
})();