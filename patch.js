(function(){
  var again=document.getElementById("againBtn");
  var mastery=document.getElementById("masteryText");
  var summary=document.getElementById("roundSummary");
  var done=document.getElementById("roundDone");
  var nextHidden=document.getElementById("nextSetBtn");
  if(!again||!mastery||!nextHidden)return;

  function mastered(){return mastery.textContent.replace(/\s/g,"")==="12/12"}
  function sync(){
    if(mastered()&&done&&done.className.indexOf("show")>=0){
      again.textContent="Следующий набор";
      if(summary)summary.textContent="Набор закреплён. Открываем следующие слова.";
    }else if(done&&done.className.indexOf("show")>=0){
      again.textContent="Ещё раз";
    }
  }
  again.addEventListener("click",function(e){
    if(mastered()){
      e.preventDefault();
      e.stopImmediatePropagation();
      nextHidden.click();
    }
  },true);
  if(window.MutationObserver&&done){
    new MutationObserver(sync).observe(done,{attributes:true,attributeFilter:["class"]});
  }
})();