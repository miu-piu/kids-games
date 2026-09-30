(function(){
  var sets=window.SPEECH_SETS||[], STORAGE="speechGamesV2";
  var state=loadState(), first=null, second=null, locked=false, misses={}, matched=0, holdTimer=null, parentMode=false;
  var board=id("board"), overlay=id("wordOverlay"), bigEmoji=id("bigEmoji"), bigWord=id("bigWord"), speakBtn=id("speakBtn");
  var roundDone=id("roundDone"), roundSummary=id("roundSummary"), setTitle=id("setTitle"), setSubtitle=id("setSubtitle");
  var masteryText=id("masteryText"), masteryFill=id("masteryFill"), progressList=id("progressList"), parentPanel=id("parentPanel");
  var parentLock=id("parentLock"), lockHint=id("lockHint");

  function id(x){return document.getElementById(x)}
  function loadState(){
    try{
      var s=JSON.parse(localStorage.getItem(STORAGE)||"null");
      if(s&&typeof s.setIndex==="number"&&s.mastery)return s;
    }catch(e){}
    return {setIndex:0,mastery:{},round:0};
  }
  function save(){localStorage.setItem(STORAGE,JSON.stringify(state))}
  function key(word){return "s"+state.setIndex+":"+word}
  function points(word){return Number(state.mastery[key(word)]||0)}
  function setPoints(word,n){state.mastery[key(word)]=Math.max(0,Math.min(3,n));save()}
  function currentSet(){return sets[state.setIndex%sets.length]}
  function shuffle(a){
    var x=a.slice(),i,j,t;
    for(i=x.length-1;i>0;i--){j=Math.floor(Math.random()*(i+1));t=x[i];x[i]=x[j];x[j]=t}
    return x;
  }
  function buildDeck(){
    var items=currentSet().items, deck=[],i;
    for(i=0;i<items.length;i++){
      deck.push({emoji:items[i][0],word:items[i][1],pair:i});
      deck.push({emoji:items[i][0],word:items[i][1],pair:i});
    }
    return shuffle(deck);
  }
  function render(){
    var set=currentSet(), deck=buildDeck(), i;
    first=second=null;locked=false;misses={};matched=0;roundDone.className="round-done";
    setTitle.textContent="Учимся: "+set.name;
    setSubtitle.textContent="Набор "+(state.setIndex+1)+" · 4 слова";
    board.innerHTML="";
    for(i=0;i<deck.length;i++) createCard(deck[i],i);
    updateProgress();
  }
  function createCard(item,pos){
    var b=document.createElement("button");
    b.type="button";b.className="card";b.setAttribute("aria-label","Закрытая карточка");
    b.innerHTML='<div class="face back">?</div><div class="face front"><div class="emoji">'+item.emoji+'</div><div class="word">'+item.word+'</div></div>';
    b._item=item;
    b.addEventListener("mousedown",function(e){e.preventDefault();openCard(b)});
    board.appendChild(b);
  }
  function openCard(btn){
    if(locked||overlay.className.indexOf("show")>=0||btn.className.indexOf("matched")>=0||btn===first)return;
    btn.className+=" open";
    if(!first){first=btn;return}
    if(second)return;
    second=btn;locked=true;
    if(first._item.pair===second._item.pair){
      window.setTimeout(function(){
        first.className="card matched";second.className="card matched";
        var word=second._item.word;
        if(!misses[word])setPoints(word,points(word)+1);
        matched++;first=second=null;locked=false;
        showWord(second?second._item:null,word);
      },180);
    }else{
      misses[first._item.word]=true;misses[second._item.word]=true;
      window.setTimeout(function(){
        first.className="card";second.className="card";first=second=null;locked=false;
      },650);
    }
  }
  board.addEventListener("touchstart",function(e){
    if(parentMode)return;
    var list=e.changedTouches,i,el,card;
    for(i=0;i<list.length;i++){
      el=document.elementFromPoint(list[i].clientX,list[i].clientY);
      card=closestCard(el);
      if(card)openCard(card);
    }
    e.preventDefault();
  },{passive:false});
  function closestCard(el){
    while(el&&el!==document.body){if((" "+el.className+" ").indexOf(" card ")>=0)return el;el=el.parentNode}
    return null;
  }
  function showWord(item,word){
    var s=currentSet(),i,emoji="";
    for(i=0;i<s.items.length;i++)if(s.items[i][1]===word)emoji=s.items[i][0];
    bigEmoji.textContent=emoji;bigWord.textContent=word;overlay.className="overlay show";
    window.setTimeout(function(){speak(word)},180);
  }
  function hideWord(){
    overlay.className="overlay";
    updateProgress();
    if(matched>=4)finishRound();
  }
  function speak(word){
    if(!("speechSynthesis" in window))return;
    try{
      window.speechSynthesis.cancel();
      var u=new SpeechSynthesisUtterance(word.toLowerCase());
      u.lang="ru-RU";u.rate=.82;u.pitch=1;
      var voices=window.speechSynthesis.getVoices(),i;
      for(i=0;i<voices.length;i++){
        if((voices[i].lang||"").toLowerCase().indexOf("ru")===0){u.voice=voices[i];break}
      }
      window.speechSynthesis.speak(u);
    }catch(e){}
  }
  speakBtn.addEventListener("click",function(e){e.stopPropagation();speak(bigWord.textContent)});
  overlay.addEventListener("click",function(e){if(e.target===speakBtn)return;hideWord()});
  overlay.addEventListener("touchstart",function(e){if(e.target===speakBtn)return;e.preventDefault();hideWord()},{passive:false});

  function updateProgress(){
    var set=currentSet(),sum=0,i,p;
    progressList.innerHTML="";
    for(i=0;i<set.items.length;i++){
      p=points(set.items[i][1]);sum+=p;
      addProgressRow(set.items[i][0]+" "+set.items[i][1],p);
    }
    masteryText.textContent=sum+" / 12";
    masteryFill.style.width=Math.round(sum/12*100)+"%";
  }
  function addProgressRow(label,p){
    var r=document.createElement("div");r.className="progress-row";
    r.innerHTML="<span>"+label+"</span><span class=\"dots\">"+dots(p)+"</span>";
    progressList.appendChild(r);
  }
  function dots(p){return (p>0?"●":"○")+(p>1?"●":"○")+(p>2?"●":"○")}
  function allMastered(){
    var items=currentSet().items,i;
    for(i=0;i<items.length;i++)if(points(items[i][1])<3)return false;
    return true;
  }
  function finishRound(){
    state.round=(state.round||0)+1;save();
    roundSummary.textContent=allMastered()?"Набор закреплён. Можно идти дальше.":"Слабые слова останутся в тренировке.";
    roundDone.className="round-done show";
  }
  id("againBtn").addEventListener("click",render);

  function nextSet(){
    if(state.setIndex<sets.length-1)state.setIndex++;else state.setIndex=0;
    save();render();closeParent();
  }
  id("nextSetBtn").addEventListener("click",nextSet);
  id("restartSetBtn").addEventListener("click",function(){
    var items=currentSet().items,i;
    for(i=0;i<items.length;i++)delete state.mastery[key(items[i][1])];
    save();render();closeParent();
  });

  function openParent(){parentMode=true;document.body.className="";parentPanel.className="parent-panel show";updateProgress()}
  function closeParent(){parentMode=false;document.body.className="child-locked";parentPanel.className="parent-panel"}
  id("closeParentBtn").addEventListener("click",closeParent);

  parentLock.addEventListener("touchstart",startHold,{passive:false});
  parentLock.addEventListener("mousedown",startHold);
  parentLock.addEventListener("touchend",cancelHold);
  parentLock.addEventListener("mouseup",cancelHold);
  parentLock.addEventListener("mouseleave",cancelHold);
  function startHold(e){
    if(e)e.preventDefault();cancelHold();lockHint.className="lock-hint show";
    holdTimer=window.setTimeout(function(){lockHint.className="lock-hint";openParent();holdTimer=null},3000);
  }
  function cancelHold(){
    if(holdTimer){window.clearTimeout(holdTimer);holdTimer=null}
    lockHint.className="lock-hint";
  }

  document.addEventListener("touchmove",function(e){if(!parentMode)e.preventDefault()},{passive:false});
  document.addEventListener("contextmenu",function(e){if(!parentMode)e.preventDefault()});

  if(!("speechSynthesis" in window))speakBtn.style.display="none";
  render();
})();