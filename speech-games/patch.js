(function(){
  var board=document.getElementById("board");
  var again=document.getElementById("againBtn");
  var mastery=document.getElementById("masteryText");
  var done=document.getElementById("roundDone");
  var nextSet=document.getElementById("nextSetBtn");
  if(!board||!again||!mastery||!done||!nextSet)return;

  function mastered(){
    return mastery.textContent.replace(/\s/g,"")==="12/12";
  }

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
    size=Math.max(90,size);
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