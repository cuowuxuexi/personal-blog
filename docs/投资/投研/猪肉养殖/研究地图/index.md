---
title: 猪肉养殖知识图谱
description: 猪肉养殖行业可复用的商品身份、生产时滞、周期驱动、成本口径与账上关系图
pageClass: map-index
outline: [2, 3]
order: 0
hubLead: 商品身份、生产时滞、周期驱动、成本口径、账上分层和公司坐标的总体拓扑。
---

<nav class="research-breadcrumb"><a href="/投资/投研/">投研标的</a><span>/</span><a href="/投资/投研/猪肉养殖/">猪肉养殖行业</a><span>/</span><strong>猪肉养殖知识图谱</strong></nav>

<section class="industry-masthead">
  <p>KNOWLEDGE GRAPH / 猪肉养殖知识图谱</p>
  <h1>猪肉养殖知识图谱</h1>
  <p>这张图谱把商品身份、生产时滞、周期驱动、成本口径、账上分层和公司坐标连成一组可复用的关系。</p>
</section>

<div class="research-note">
  <strong>当前边界</strong>
  <span>节点关系用于组织行业问题，不等于已经完成公司层面的证据核验；公司出栏、完全成本、利润、现金和投资判断仍须单独取证。牧原 / 温氏只当坐标，不是本页的已核验对象。信息截至 2026-09-06。</span>
</div>

<section class="research-section" aria-labelledby="path-maps">
  <header class="research-section-head">
    <div><p>PATH MAPS / 养殖路径图谱</p><h2 id="path-maps">从能繁到出栏</h2></div>
  </header>
  <figure class="research-figure">
    <div class="knowledge-chain">
      <span><small>01</small><strong>能繁配种</strong><em>决定要不要多造下一批猪</em></span>
      <i>→</i>
      <span><small>02</small><strong>怀孕约四个月</strong><em>今天加母猪，改不了今天的供给</em></span>
      <i>→</i>
      <span><small>03</small><strong>仔猪</strong><em>成活率开始改效率</em></span>
      <i>→</i>
      <span><small>04</small><strong>育肥约六个月</strong><em>料肉比、疫病、压栏都在这里</em></span>
      <i>→</i>
      <span><small>05</small><strong>出栏</strong><em>变成当期供给和销售均价</em></span>
    </div>
    <figcaption>上半程：从「决定多养」到「市场上多出一公斤肉」，整段大约十个月。十个月管的是供给数量，不是把「十个月前的成本」对上今天的现货价。今天卖掉的这批猪，成本是它自己长起来这段时间花的。</figcaption>
  </figure>
  <figure class="research-figure" id="lead">
    <div class="knowledge-chain">
      <span><small>盯能繁</small><strong>大约十个月</strong><em>今天母猪多了或少了，十个月后才变成出栏</em></span>
      <i>／</i>
      <span><small>盯已生仔猪</small><strong>大约六个月</strong><em>机器已经转过一截，育肥完就出栏</em></span>
      <i>／</i>
      <span><small>盯二次育肥 / 压栏</small><strong>几周到两三个月</strong><em>只改近端供给，不改能繁这台机器</em></span>
    </div>
    <figcaption>领先多久，取决于你盯的是哪一层。能繁是最常被盯的先行量：它不问下个月菜场有没有肉，它问十个月后能有多少猪可出。</figcaption>
  </figure>
  <figure class="research-figure">
    <div class="knowledge-chain">
      <span><small>能繁周期</small><strong>母猪头数</strong><em>扩会扩过头，淘会淘过头</em></span>
      <i>×</i>
      <span><small>效率周期</small><strong>PSY / 成活 / 均重</strong><em>头数没变，供给也能大变</em></span>
      <i>×</i>
      <span><small>短扰动</small><strong>二次育肥 / 压栏</strong><em>几周到几个月，带不走主轴</em></span>
      <i>→</i>
      <span><small>供给</small><strong>当期出栏</strong><em>需求相对刚性，价主要由这里定</em></span>
      <i>→</i>
      <span><small>账上</small><strong>销售 / 利润 / 现金</strong><em>三层不要互相冒充</em></span>
    </div>
    <figcaption>下半程：周期是三个轮子叠在一起。对齐完全成本口径之后，再拆销售、利润、现金、资本开支，才进公司档案。</figcaption>
  </figure>
</section>

<section class="research-section" aria-labelledby="topology">
  <header class="research-section-head">
    <div><p>TOPOLOGY / 总体拓扑</p><h2 id="topology">六组节点如何连接</h2></div>
  </header>
  <div class="knowledge-graph" aria-label="猪肉养殖知识图谱总览">
    <div class="knowledge-graph__lane" id="identity">
      <div class="knowledge-graph__label"><span>01</span><strong>商品身份</strong></div>
      <div class="knowledge-flow">
        <a class="knowledge-node knowledge-node--identity" href="#q1"><small>同质</small><strong>普通商品猪</strong><span>到了屠宰和批发，大多可以互相替</span></a>
        <a class="knowledge-node knowledge-node--identity" href="#q1"><small>不好存</small><strong>压栏烧现金</strong><span>活猪每天吃料，很难先藏起来等好价钱</span></a>
        <a class="knowledge-node knowledge-node--identity" href="#q2"><small>需求刚性</small><strong>价由供给定</strong><span>需求端到了天花板，波动由供给端来扛；点价不是期价</span></a>
      </div>
    </div>
    <div class="knowledge-graph__lane" id="lag">
      <div class="knowledge-graph__label"><span>02</span><strong>生产时滞</strong></div>
      <div class="knowledge-flow">
        <a class="knowledge-node knowledge-node--research" href="#q3"><small>怀孕</small><strong>约四个月</strong><span>今天加母猪，改变不了今天的供给</span></a>
        <a class="knowledge-node knowledge-node--research" href="#q3"><small>育肥</small><strong>约六个月</strong><span>仔猪到出栏更短，总开关仍是能繁</span></a>
        <a class="knowledge-node knowledge-node--research" href="#lead"><small>先行量</small><strong>能繁十个月 / 仔猪六个月</strong><span>二次育肥只改几周到两三个月，带不走主轴</span></a>
      </div>
    </div>
    <div class="knowledge-graph__lane" id="cycle">
      <div class="knowledge-graph__label"><span>03</span><strong>周期驱动</strong></div>
      <div class="knowledge-flow">
        <a class="knowledge-node knowledge-node--manufacturing" href="#q4"><small>头数</small><strong>能繁周期</strong><span>扩过头、淘过头，大约十个月才变成出栏</span></a>
        <a class="knowledge-node knowledge-node--manufacturing" href="#q4"><small>乘数</small><strong>效率周期</strong><span>配种率、PSY、成活率；2018 年后可以盖过能繁</span></a>
        <a class="knowledge-node knowledge-node--manufacturing" href="#q4"><small>几周</small><strong>短扰动</strong><span>二次育肥、压栏、恐慌出栏；解释不了十个月回合</span></a>
      </div>
    </div>
    <div class="knowledge-graph__lane" id="cost">
      <div class="knowledge-graph__label"><span>04</span><strong>成本与口径</strong></div>
      <div class="knowledge-flow">
        <a class="knowledge-node knowledge-node--service" href="#q5"><small>累积</small><strong>育种 / 饲料 / 成活 / 料肉比</strong><span>各差一点点，最后差出一块钱</span></a>
        <a class="knowledge-node knowledge-node--service" href="#q5"><small>摊销</small><strong>完全成本 元/kg</strong><span>卖掉一公斤，公司自己认为花了多少</span></a>
        <a class="knowledge-node knowledge-node--service" href="#q5"><small>对齐</small><strong>管理口径 ≠ 审计口径</strong><span>12 和 12.4 不能直接说前者更优</span></a>
      </div>
    </div>
    <div class="knowledge-graph__lane" id="books">
      <div class="knowledge-graph__label"><span>05</span><strong>账上四层</strong></div>
      <div class="knowledge-flow">
        <a class="knowledge-node knowledge-node--payment" href="#q7"><small>销售</small><strong>出栏 × 均价</strong><span>猪有没有卖掉；均价不是利润</span></a>
        <a class="knowledge-node knowledge-node--payment" href="#q2"><small>利润</small><strong>归母净利润</strong><span>现货反弹可以仍低于完全成本；预告不是已审</span></a>
        <a class="knowledge-node knowledge-node--payment" href="#q7"><small>现金</small><strong>经营现金 / 短债</strong><span>低价年里，利润、现金、短债常常一起紧</span></a>
        <a class="knowledge-node knowledge-node--payment" href="#q7"><small>开支</small><strong>新增 vs 维持</strong><span>扩产开支不是已经形成的优势</span></a>
      </div>
    </div>
    <div class="knowledge-graph__lane" id="map">
      <div class="knowledge-graph__label"><span>06</span><strong>格局与映射</strong></div>
      <div class="knowledge-flow">
        <a class="knowledge-node knowledge-node--company" href="#q6"><small>行业三层</small><strong>集团 / 地方 / 专业散户</strong><span>不是牧原、温氏那一刀；规模不自动等于成本优势</span></a>
        <a class="knowledge-node knowledge-node--company" href="#company"><small>自繁自养</small><strong>牧原股份</strong><span>卖猪为主，屠宰是延伸；本页不写公司数字</span></a>
        <span class="knowledge-node knowledge-node--future"><small>公司 + 农户</small><strong>温氏股份</strong><span>档案未建；只当生产组织对照坐标</span></span>
      </div>
    </div>
  </div>
</section>

<section class="research-section" aria-labelledby="paths">
  <header class="research-section-head">
    <div><p>PATHS / 两条阅读路径</p><h2 id="paths">研究不同公司，从不同节点进入</h2></div>
  </header>
  <div class="knowledge-route-grid">
    <article>
      <span>FARMER ROUTE</span>
      <h3>研究卖猪的公司</h3>
      <p>商品身份 → 十个月时滞 → 能繁 / 效率 → 成本口径 → 账上四层 → 公司坐标。</p>
      <a href="#company">进入牧原坐标 →</a>
    </article>
    <article>
      <span>CHAIN ROUTE</span>
      <h3>研究链上延伸</h3>
      <p>屠宰进货价就是养殖出栏价：养殖赚钱时猪贵、屠宰可能薄；养殖亏损时猪便宜、屠宰未必一起亏。</p>
      <a href="#q8">看第八问 →</a>
    </article>
  </div>
</section>

<section class="research-section" aria-labelledby="check">
  <header class="research-section-head">
    <div><p>CHECK / 关键问题索引</p><h2 id="check">八个关键问题</h2></div>
  </header>
  <p>每一问都对应其归属的知识节点；答案写在下面，可以沿关系继续看相关概念。</p>
  <ol class="knowledge-checklist">
    <li id="q1"><a href="#a1">猪作为商品，同质、不好存、需求刚性各指什么？为什么价格主要由供给决定？</a></li>
    <li id="q2"><a href="#a2">为什么猪价反弹了，甚至反弹到你听说的「成本线」以上，行业仍可能亏？</a></li>
    <li id="q3"><a href="#a3">能繁存栏大约领先出栏多久？为什么？盯仔猪或二次育肥时，领先关系怎么变？</a></li>
    <li id="q4"><a href="#a4">能繁周期和效率周期各改供给的哪一块？2018 年之后周期形状为什么可能变陡，后来又为什么可能把方向交回能繁？</a></li>
    <li id="q5"><a href="#a5">完全成本（元/kg）摊的是什么？两家公司报 12 和 12.4，能不能说前者更优？</a></li>
    <li id="q6"><a href="#a6">集团、地方企业、专业散户大概是怎样三层？规模化为什么推进？为什么规模不自动等于成本优势？</a></li>
    <li id="q7"><a href="#a7">销售、利润、现金、资本开支各看什么？低价年为什么现金和短债会一起紧？</a></li>
    <li id="q8"><a href="#a8">屠宰赚钱、养殖赚钱，为什么常常不是同一年的事？</a></li>
  </ol>
  <div class="answer-list">
    <div class="answer-card" id="a1">
      <strong>同质、不好存、需求刚，价由供给定</strong>
      <p>普通商品猪到了屠宰和批发，大多可以互相替；土猪黑猪是很小一格，不改主链。活猪不杀就要继续吃料、占栏、占产线；杀完会变质，冻品也有仓和库存压力。中国人的猪肉摄入相对稳，需求端到了天花板，波动就由供给端来扛。供给自己还有能繁、效率和短扰动，所以价会甩。</p>
    </div>
    <div class="answer-card" id="a2">
      <strong>现货反弹不是已经赚钱；十个月不要接到成本上</strong>
      <p>反弹多半是现货点价。行业仍可能亏，常见三层：现货仍低于完全成本；某一周涨了，半年卖出去的均价还趴着；你听说的「成本线」往往是某家管理数或现金料钱，不是全行业同一条线。十个月管的是供给数量——十个月前多留的母猪，变成今天能卖的猪多不多。今天这批猪的成本，是它自己长起来这段时间花的，不是「十个月前的成本对今天的现货」。</p>
    </div>
    <div class="answer-card" id="a3">
      <strong>能繁大约十个月；仔猪大约六个月；二次育肥只改近端</strong>
      <p>怀孕大约四个月，育肥大约六个月，从配种到出栏大约十个月。盯能繁：今天母猪变了，大约十个月后才变成出栏。盯已经生下来的仔猪：大约六个月后出栏。盯二次育肥、压栏、放栏：改未来几周到两三个月的供给，不改能繁这台机器。</p>
    </div>
    <div class="answer-card" id="a4">
      <strong>能繁改头数，效率改乘数；非瘟之后谁开车可以换</strong>
      <p>出栏 ≈ 能繁头数 × 配种率 × PSY × 成活 × 均重。能繁周期改前面的头数，扩会扩过头、淘会淘过头，大约十个月才变成肉。效率周期改后面那串乘数：头数没变，疫病一来供给照样少。2018 年非瘟让效率损失大到盖过能繁的慢变化，价格更陡。疫病压力下去，头数可能重新变成主线。这是机制，不是「现在已经回归」的裁决。</p>
    </div>
    <div class="answer-card" id="a5">
      <strong>完全成本是摊到每公斤出栏肉上的综合数</strong>
      <p>卖掉一公斤，公司自己认为花了多少。12 和 12.4 不能直接说前者更优。要对齐：管理口径还是报表口径、含不含总部费用和淘汰母猪、单月还是全年、有没有把仔猪种猪和商品猪并在一起。差 0.4 元，完全可能被这些对不齐吃掉。</p>
    </div>
    <div class="answer-card" id="a6">
      <strong>先行业三层，再生产组织；规模不是自动优势</strong>
      <p>行业主体粗分成集团、地方企业、专业散户。规模化推进，是因为防疫、环保、资本把门檻抬高了。规模不自动等于成本优势：疫病一把能烧掉整场，栏舍种猪沉没很重，管理半径一长一线会稀，低价年会同时面对亏损、资本开支和短债。自繁自养和公司加农户是另一刀，牧原、温氏只当坐标，不是这三层本身。</p>
    </div>
    <div class="answer-card" id="a7">
      <strong>销售、利润、现金、资本开支拆开；低价年管子停不下来</strong>
      <p>销售看出栏和均价。利润看报表上赚没赚到，预告不是已审。现金看经营现金流、账面现金和短债。资本开支单独问：加新场还是维持现有场。低价年收入往下掉，已经在栏的猪还得天天吃料，十个月的管子不能说停就停，短债仍要滚动，所以利润、现金、短债常常一起紧。</p>
    </div>
    <div class="answer-card" id="a8">
      <strong>屠宰进货价就是养殖出栏价，两边利润常错开</strong>
      <p>屠宰是买猪、杀猪、卖肉。养殖赚钱时猪贵，屠宰进货贵，屠宰可能很薄；养殖亏损时猪便宜，屠宰进货便宜，屠宰未必一起亏。开工率高只说明线在转，不说明分部已经贡献可观净利。不是「上市赚当下」对「出栏便宜市场上不一定便宜」。</p>
    </div>
  </div>
</section>

<section class="research-section" aria-labelledby="revisions">
  <header class="research-section-head">
    <div><p>CLARIFICATIONS / 易混关系</p><h2 id="revisions">容易混淆的关系</h2></div>
  </header>
  <table class="revision-table">
    <thead><tr><th>常见误解</th><th>更准确的理解</th><th>相关节点</th></tr></thead>
    <tbody>
      <tr><td>菜场涨价 = 养猪公司赚钱</td><td>点价不是期价；反弹可以仍低于完全成本</td><td><a href="#identity">商品身份</a></td></tr>
      <tr><td>十个月前的成本对今天现货</td><td>十个月管的是供给数量；今天这批猪的成本是它自己长起来这段时间</td><td><a href="#a2">第二问</a></td></tr>
      <tr><td>能繁变了，下个月猪肉就变</td><td>能繁大约十个月；仔猪大约六个月；二次育肥只改近端</td><td><a href="#lead">领先关系</a></td></tr>
      <tr><td>牧原 / 温氏两种模式 = 行业三层</td><td>三层是集团、地方、专业散户；自繁自养和公司加农户是另一刀</td><td><a href="#map">格局与映射</a></td></tr>
      <tr><td>猪周期就是盯能繁</td><td>还有效率周期和短扰动；三层时间尺度不同</td><td><a href="#cycle">周期驱动</a></td></tr>
      <tr><td>完全成本低 0.4 元就是更优</td><td>先对齐管理 / 审计、总部费用、淘汰母猪、期间</td><td><a href="#cost">成本与口径</a></td></tr>
      <tr><td>出栏大多等于利润好</td><td>销售、利润、现金是三层</td><td><a href="#books">账上四层</a></td></tr>
      <tr><td>规模大所以成本低</td><td>规模只提供把环节做深的舞台</td><td><a href="#map">格局与映射</a></td></tr>
      <tr><td>有屠宰就是一体化更稳</td><td>屠宰利润常和养殖错开；开工率不是分部净利</td><td><a href="#q8">第八问</a></td></tr>
    </tbody>
  </table>
</section>

<section class="research-section" id="company" aria-labelledby="maps">
  <header class="research-section-head">
    <div><p>MAPS / 节点详图</p><h2 id="maps">节点详图与公司坐标</h2></div>
  </header>
  <div class="knowledge-route-grid">
    <article>
      <span>01</span>
      <h3>猪周期与规模养殖</h3>
      <p>机制展开与地基八问；本页只组织关系。详图尚未单独成页。</p>
    </article>
    <article>
      <span>02</span>
      <h3>牧原股份 · 公司坐标</h3>
      <p>自繁自养一体化 × 商品猪出栏；屠宰是延伸。公司数字和档案尚未公开。</p>
    </article>
  </div>
</section>

<div class="research-note">
  <strong>来源说明</strong>
  <span>本图谱用于组织行业问题和概念关系，不替代公司披露与正式研究证据。机制框架只取可复用关系，不取猪价时点或左侧右侧。</span>
</div>
