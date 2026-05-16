import type { LiuyaoBoard, YaoLineBoard } from "@/types/liuyao-board";

type KnowledgeRule = {
  id: string;
  title: string;
  allTags?: string[];
  anyTags?: string[];
  when: string;
  reading: string;
  cautions?: string;
};

const MAX_RULES = 8;

function normalizeSixGod(s: string | undefined): string {
  if (!s) return "";
  return s.replaceAll("螣", "腾").trim();
}

function isKongBranch(branch: string | undefined, dayXunKong: string): boolean {
  return Boolean(branch && dayXunKong.includes(branch));
}

function addLineTags(tags: Set<string>, line: YaoLineBoard, dayXunKong: string) {
  const sixGod = normalizeSixGod(line.sixGod);
  if (sixGod) tags.add(`sixGod:${sixGod}`);
  if (line.liuQin) tags.add(`liuQin:${line.liuQin}`);
  if (line.fiveElement) tags.add(`element:${line.fiveElement}`);

  if (line.shiYing) {
    tags.add(`${line.shiYing}`);
    if (sixGod) tags.add(`${line.shiYing}:sixGod:${sixGod}`);
    if (line.liuQin) tags.add(`${line.shiYing}:liuQin:${line.liuQin}`);
    if (line.fiveElement) tags.add(`${line.shiYing}:element:${line.fiveElement}`);
  }

  if (line.moving) {
    tags.add("moving");
    if (sixGod) tags.add(`moving:sixGod:${sixGod}`);
    if (line.liuQin) tags.add(`moving:liuQin:${line.liuQin}`);
    if (line.fiveElement) tags.add(`moving:element:${line.fiveElement}`);
  }

  if (isKongBranch(line.branch, dayXunKong)) {
    tags.add("空亡");
    if (line.liuQin) tags.add(`空亡:liuQin:${line.liuQin}`);
    if (line.shiYing) tags.add(`空亡:${line.shiYing}`);
  }

  if (line.fuShen) {
    tags.add("伏神");
    if (line.fuShen.liuQin) tags.add(`伏神:liuQin:${line.fuShen.liuQin}`);
  }
}

function extractQuestionTags(question: string): string[] {
  const tags: string[] = [];
  if (/工作|事业|上班|跳槽|离职|入职|offer|领导|同事|项目/.test(question)) {
    tags.push("question:work");
  }
  if (/感情|关系|复合|喜欢|恋爱|婚|对象|他|她/.test(question)) {
    tags.push("question:relationship");
  }
  if (/钱|财|收入|投资|生意|客户|合同|付款|回款/.test(question)) {
    tags.push("question:wealth");
  }
  if (/考试|学习|证书|面试|申请|材料|文书|审批|签证/.test(question)) {
    tags.push("question:document");
  }
  return tags;
}

function extractBoardTags(board: LiuyaoBoard, question: string): Set<string> {
  const tags = new Set<string>(extractQuestionTags(question));
  tags.add(`hex:${board.benGua.name}`);
  if (board.bianGua) tags.add(`changed:${board.bianGua.name}`);
  for (const line of board.benGua.lines) {
    addLineTags(tags, line, board.meta.dayXunKong);
  }
  return tags;
}

const LOCAL_LIUYAO_RULES: KnowledgeRule[] = [
  {
    id: "tengshe-fire-moving",
    title: "腾蛇发动临火",
    allTags: ["moving:sixGod:腾蛇", "moving:element:火"],
    when: "腾蛇临动爻，又临火或得火势时。",
    reading:
      "此象不宜只写成焦虑。腾蛇主疑惧、缠绕、虚惊、心结；遇火则念头更躁，容易表现为心里有虚处、怕露馅、怕被追问、口径反复，或为了遮一处漏洞而连续补救。若再牵连父母、官鬼、玄武，应重点看文书凭据、规则压力、隐情与不敢明说之处。",
    cautions:
      "不可单凭腾蛇断心虚，必须回看它临何六亲、是否为世应动爻、是否受月日扶抑，以及它冲合生克谁。",
  },
  {
    id: "tengshe-shi",
    title: "腾蛇临世",
    allTags: ["世:sixGod:腾蛇"],
    when: "腾蛇临世爻，尤其世爻又动、受克、空亡或与官鬼父母相牵。",
    reading:
      "多先看求测者自身状态：疑虑重、心里绕、睡不踏实、担心某事被揭开，也可能是明面问一件事，心里真正挂着另一处。若卦中另有财坏印、玄武、父母空亡等象，常见为底气不足、凭据不硬、怕对方追问细节。",
    cautions:
      "若世爻旺相且得生，腾蛇也可只是谨慎、多想，不一定就是有错或有隐情。",
  },
  {
    id: "xuanwu-ying",
    title: "玄武临应",
    allTags: ["应:sixGod:玄武"],
    when: "玄武临应爻，或应爻又动、空亡、受克。",
    reading:
      "应爻为对方、外部、所问对象。玄武临应，多看对方信息不透明、真实想法未明、暗中另有安排，或事情有一层没有摆到台面上。问关系则多疑暧昧和遮掩；问合作与流程则看暗线、拖着不说、口径不全。",
    cautions:
      "不可直接断欺骗，需结合应爻旺衰、动化、与世爻关系判断是隐情、顾虑、保留，还是实有遮掩。",
  },
  {
    id: "zhuque-moving",
    title: "朱雀发动",
    allTags: ["moving:sixGod:朱雀"],
    when: "朱雀临动爻。",
    reading:
      "朱雀主动，多主消息、表达、争执、文辞、口头承诺与舆论。若动爻生世，可看有消息来、说法推动；若克世或冲应，容易是口舌、解释成本、说法前后不一。临父母偏文书通知，临官鬼偏责问压力，临兄弟偏争辩竞争。",
    cautions:
      "不要只写有消息，要看消息是帮忙、添乱、催促，还是造成口舌。",
  },
  {
    id: "gouchen-fumu",
    title: "勾陈临父母",
    allTags: ["sixGod:勾陈", "liuQin:父母"],
    when: "勾陈与父母爻同见，尤其父母为世应动爻、空亡或受克。",
    reading:
      "父母主文书、凭据、规则、流程、保护与底气；勾陈主拖滞、旧事、牵连、手续。合看多是流程卡住、材料来回、旧问题未清、规则层面拖住，或某个凭据不够完整。问人情时，也可转成说法需要凭据支撑，不能只凭口头。",
    cautions:
      "若父母旺而生世，可能是手续虽慢但有保护；若父母空破受克，才更像凭据弱或规则不站边。",
  },
  {
    id: "cai-fumu",
    title: "财坏印",
    allTags: ["liuQin:妻财", "liuQin:父母"],
    when: "妻财与父母在卦中形成明显冲克、动克、被动牵制，或财爻发动而父母弱空。",
    reading:
      "财坏印可读为现实利益、欲望、资源分配压过文书凭据、规则、承诺、保护与底气。落到人事上，常见为了钱、利益、结果或面子，牺牲了程序与说法；问心态时，可表现为理据不足、心虚、怕查凭据、怕被追问。",
    cautions:
      "此条必须结合五行生克与动爻方向，不可只因卦中同时有财和父母就断财坏印。",
  },
  {
    id: "job-cai-breaks-fumu",
    title: "工作占：财坏父母",
    allTags: ["question:work", "liuQin:妻财", "liuQin:父母"],
    when: "问工作、求职、跳槽、offer、入职或岗位变动时，卦中财爻与父母爻形成明显冲克、动克，或财旺而父母弱空。",
    reading:
      "工作占里，父母常取合同、offer、入职流程、证明、资质、保护层与工作名分；财来坏父母，先不要只说钱财牵动文书，要核验此人是否当前没有稳定工作、刚离职或空窗、岗位说法未落纸、offer/合同不稳、入职手续没成，或现实薪资资源压力冲掉了原本的工作保护。若世爻也弱、空、受克，更像本人承接不到这个工作名分；若应爻或官鬼另有力，则可能是岗位有但手续、条件或利益分配卡住。",
    cautions:
      "必须结合官鬼是否有根、父母是否真受克或空破、动爻方向与世应承接关系；不可只因有财有父母就断没工作。",
  },
  {
    id: "fumu-kong",
    title: "父母空亡",
    allTags: ["空亡:liuQin:父母"],
    when: "父母爻逢空亡，尤其父母为用、为动、为世应所依。",
    reading:
      "父母空，多看文书、凭据、承诺、流程、消息来源、保护层暂时落空。现实中常见材料未齐、说法没有落纸、批复未实、承诺还只是口头，或求测者以为有依据但实际支撑不足。",
    cautions:
      "空亡不等于永远没有，需看冲空、出空、动化与月日扶抑。",
  },
  {
    id: "guigui-shi",
    title: "官鬼持世",
    allTags: ["世:liuQin:官鬼"],
    when: "官鬼临世爻。",
    reading:
      "官鬼持世先看压力、责任、规训、病忧、担责或被规则牵住。问工作可为岗位职责、上级压力、考核制度；问关系可为心理负担或被某种名分规则压住；若再临白虎、腾蛇、朱雀，则分别偏硬冲突、疑惧心虚、口舌责问。",
    cautions:
      "官鬼持世不一概为坏，旺而得用时也可代表职位、权责、名分与可承接的压力。",
  },
  {
    id: "baohu-moving",
    title: "白虎发动",
    allTags: ["moving:sixGod:白虎"],
    when: "白虎临动爻。",
    reading:
      "白虎动，多看硬碰硬、急迫、伤损、冲突、强压与破局。问工作合作时可为强势要求、责罚、冲突升级；问身体与状态时看疼痛、损伤、疲惫；问关系则偏话重、伤人、矛盾直接化。",
    cautions:
      "需结合白虎动爻是否克世、冲应、化退或得制；被制时多为压力有出口，不必写得过凶。",
  },
];

function scoreRule(rule: KnowledgeRule, tags: Set<string>): number {
  const all = rule.allTags ?? [];
  if (all.some((tag) => !tags.has(tag))) return 0;
  let score = all.length * 3;
  for (const tag of rule.anyTags ?? []) {
    if (tags.has(tag)) score += 1;
  }
  return score;
}

export function findLiuyaoKnowledgeRules(params: {
  board: LiuyaoBoard;
  question: string;
  limit?: number;
}): KnowledgeRule[] {
  const tags = extractBoardTags(params.board, params.question);
  return LOCAL_LIUYAO_RULES.map((rule) => ({
    rule,
    score: scoreRule(rule, tags),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, params.limit ?? MAX_RULES)
    .map((x) => x.rule);
}

export function formatLiuyaoKnowledgeForPrompt(params: {
  board: LiuyaoBoard;
  question: string;
  limit?: number;
}): string {
  const rules = findLiuyaoKnowledgeRules(params);
  if (rules.length === 0) {
    return "【本地断法知识库】\n本卦暂未命中特定条目；仍按世应动、六亲、六神、旺衰与空伏细读。";
  }

  const body = rules
    .map((rule, idx) => {
      const parts = [
        `${idx + 1}. ${rule.title}`,
        `适用：${rule.when}`,
        `读法：${rule.reading}`,
      ];
      if (rule.cautions) parts.push(`禁忌：${rule.cautions}`);
      return parts.join("\n");
    })
    .join("\n\n");

  return `【本地断法知识库（命中条目，供参考，不可机械套用）】\n${body}`;
}
