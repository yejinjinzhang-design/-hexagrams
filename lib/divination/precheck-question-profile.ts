/**
 * 「验证前事」阶段：按用户原问题粗分类，注入优先核验维度（非 UI 展示）。
 */

export type PrecheckQuestionKind =
  | "job"
  | "relationship"
  | "reunion"
  | "exam"
  | "career"
  | "cooperation"
  | "finance"
  | "product"
  | "general";

export interface PrecheckQuestionProfile {
  kind: PrecheckQuestionKind;
  labelZh: string;
  priorityValidationDimensions: string[];
  suggestedAngles: string[];
  keyTimelineFocus: string;
  likelyCauseFocus: string;
}

const PROFILES: Record<
  PrecheckQuestionKind,
  Omit<PrecheckQuestionProfile, "kind">
> = {
  job: {
    labelZh: "求职 / 工作与职业变动",
    priorityValidationDimensions: [
      "最近是否已有离职、失业、换岗、被迫中断或明显空窗",
      "关键转折大致落在什么时间段（不必断言具体日期，可有「近来 / 有一段时日」等分寸）",
      "更似主动求变还是被动受挫（环境、编制、关系、业绩等）",
      "诱因更偏外部变化、岗位不稳、与上级或团队张力、发展方向不合，还是压力与回报失衡",
      "当前是否已在投递、面试、等待回复，或机会将定未定",
    ],
    suggestedAngles: [
      "先锚定「与工作变动直接相关」的已发生事实，再落到卦中世应、官鬼、财爻、动爻",
      "区分「刚离开不久」「空窗已有一段」「有面无果」「机会悬而未决」等阶段感，用可核对说法写出",
      "原因感可与卦中刑冲合害、兄弟竞夺、官鬼受制等相呼应；禁止用「投入心力」「酝酿」等空句开篇",
    ],
    keyTimelineFocus:
      "从动念离职或实际离开算起，到当下投递与面试节奏，哪一段最值得关注。",
    likelyCauseFocus:
      "环境变故、编制或业务调整、人际与权责、业绩与压力、自我发展预期与现实落差。",
  },
  relationship: {
    labelZh: "感情与人际亲密",
    priorityValidationDimensions: [
      "近来是否联系减少、冷淡、争执、僵持、疏远或实质断联",
      "问题从何时起变得明显（可保留模糊而不过分武断）",
      "更似态度反复、现实阻碍、第三方因素、沟通失衡，还是期待错位",
      "当前处于试探、僵持、疏远、未正式结束，抑或一方已明显后撤",
    ],
    suggestedAngles: [
      "先对照用户所问（如是否再联系、能否和好）点名最该核对的「已发生」情节：何时起淡、是否争执或断联、谁后撤",
      "再用应爻、世爻、财官、动爻说明卦气何以映出此等局面",
      "避免「心中不安」「反复纠结」等无法核对的纯心理句作主语",
    ],
    keyTimelineFocus:
      "关系由热转冷、由近转疏的关键转折大致落在什么阶段。",
    likelyCauseFocus:
      "现实条件、家庭或社交圈、第三者阴影、沟通方式、承诺与期待的落差。",
  },
  reunion: {
    labelZh: "复合 / 挽回 / 和好",
    priorityValidationDimensions: [
      "疏远或分手前，是否已出现过联系变少、争吵、承诺落空等可查节点，大致从何时起变得明显",
      "断联或冷淡是某一两次事件后急转，还是两三周内逐步降温",
      "最后一次实质互动（见面、长谈、和好尝试）距今大致多久、谁更后撤",
      "阻碍更偏心结未解、现实距离、他人介入，还是自尊与面子",
    ],
    suggestedAngles: [
      "紧扣「还能不能和好 / 对方会否回头」所依赖的前情：最后一次实质互动、谁主动后撤",
      "卦中世应、动爻、刑冲可映出「谁更急、谁更退」，但仍须从问题出发写",
    ],
    keyTimelineFocus:
      "从最后一次「尚算正常」到当下，关系滑坡或断点的节奏。",
    likelyCauseFocus:
      "争执导火索、累积失望、外部压力、第三者疑云或明确存在、沟通断裂。",
  },
  exam: {
    labelZh: "考试 / 学业 / 资格",
    priorityValidationDimensions: [
      "备考或报名、缴费、材料提交等动作，最早大致从何时开始、最近一周主要在做什么",
      "此前是否有一次或多次失利、发挥失常、准备明显不足的可查经历",
      "当前更偏冲刺、等待放榜、复试前，还是仍在犹豫是否报考",
      "压力主要来自时间不够、方法、家庭期望、竞争强度，还是基础薄弱",
    ],
    suggestedAngles: [
      "先核验与用户所问（能否考上、能否通过、名次大致）直接相关的准备史与心态史",
      "再以父母爻、官鬼、子孙等说明卦象如何映出积累与发挥",
    ],
    keyTimelineFocus:
      "从决定备考到当下，哪一阶段投入或波动最明显。",
    likelyCauseFocus:
      "时间分配、方法是否对路、外部干扰、信心起伏、身体或情绪耗损。",
  },
  career: {
    labelZh: "职场发展 / 晋升 / 人际权势",
    priorityValidationDimensions: [
      "诉求是升职、加薪、调岗、避祸还是改善与上级同事关系",
      "苗头或矛盾从何时起在台面上可被感知，最近一两周有无新动作（谈话、人事变动、指标调整）",
      "卡点更在时间、资源、派系、业绩认定，还是上级态度摇摆",
      "自己是否已采取争取、沟通、隐忍或寻找退路等可查行动",
    ],
    suggestedAngles: [
      "与「仍在同一组织内发展」相关的前情，区别于单纯跳槽求职",
      "官鬼、父母、兄弟在卦中的动静可与权责、文书、同侪压力相呼应",
    ],
    keyTimelineFocus:
      "从苗头出现到矛盾或机遇明朗的大致阶段。",
    likelyCauseFocus:
      "组织调整、上司更迭、同事掣肘、业绩评价、个人定位与期待。",
  },
  cooperation: {
    labelZh: "合作 / 项目 / 商务推进",
    priorityValidationDimensions: [
      "双方是否已实质接触、洽谈、出过方案或草签，抑或仍停留在意向",
      "卡住点更在时间排期、资源投入、对方态度反复，还是条款与风险",
      "近期有无临时变卦、延后、改稿、换人对接等波折",
      "当前更像等待批复、僵持、重新推进，还是窗口在收窄",
    ],
    suggestedAngles: [
      "先写清「这件事已经推进到哪一步」，再论卦中应爻、财爻、父母文书之象",
      "避免只讲「时机未到」而不说具体卡在哪里",
    ],
    keyTimelineFocus:
      "从首次对接到最近一次关键节点的时间感。",
    likelyCauseFocus:
      "利益分配、信任基础、外部政策或市场变化、执行能力与承诺兑现。",
  },
  finance: {
    labelZh: "财运 / 投资 / 借贷",
    priorityValidationDimensions: [
      "感到吃紧或看到机会，最早可追溯的大致时间点；最近一笔相关进出或决策约在何时",
      "涉及投资、借贷、经营周转或固定开支中的哪一类为主",
      "近期是否有亏损、回款拖延、口头承诺未兑现等可查情况",
      "当前更偏观望、加码、止损，还是等待他人履约",
    ],
    suggestedAngles: [
      "先核对与用户所问金额、风险承受直接相关的前情，再落到财爻、兄弟劫财、子孙财源",
      "语气保留分寸，不断言具体数字或必赚必赔",
    ],
    keyTimelineFocus:
      "从感到吃紧或看到机会，到当下决策窗口的大致经过。",
    likelyCauseFocus:
      "现金流、杠杆、合作方信用、市场波动、家庭或合伙人的影响。",
  },
  product: {
    labelZh: "产品 / 功能 / 上线与发布节奏",
    priorityValidationDimensions: [
      "动手做需求、出原型、开发或联调，大致从何时已开始（明显早于「才想到」几天）",
      "中间是否已出现至少一轮改版、返工、排期延后或方向微调",
      "当前卡点更像「做没做」还是「何时上、是否够稳、细节与验收是否未封口」",
      "是否已进入测试、打磨、走流程、对齐全员之类上线前动作，而非仍停在纯构思",
      "用户专门来问某月或某窗上线，往往说明离发布已不远但仍有一两处关键未定——试着点出更像卡在哪类未定",
    ],
    suggestedAngles: [
      "用卦象支撑「进度感」：父母文书、官鬼压力、子孙泄秀、兄弟竞源等，都要落到可核对的动作上",
      "避免只写「时机」而不写卡在需求、研发、测试、法务、市场还是老板拍板",
    ],
    keyTimelineFocus:
      "从立项或首版动手到最近一次改稿、提测、延期节点的大致节奏。",
    likelyCauseFocus:
      "人力、质量风险、依赖方、评审流程、资源排期、外部合规或市场窗口。",
  },
  general: {
    labelZh: "综合 / 未细分类",
    priorityValidationDimensions: [
      "与用户原话直接相关的那件事：最近一次可见动作或变化大致发生在什么前后",
      "当下更像刚开始做、已提交待批、僵持、等待回复，还是接近结果仍未封口",
      "是否已出现过一次延期、落空、搁置后又重启、或对方态度反复等可查情节",
      "卡点更像时间、资源、他人态度、条件不成熟，还是方向未拍板——尽量指出类别而非只说「不顺」",
    ],
    suggestedAngles: [
      "先写出用户能对号入座的「事件级」前情，再点到卦中世应、动爻、用神",
      "宁可写得具体而偶错，也不要整段谁都能套用的状态描写",
    ],
    keyTimelineFocus:
      "从用户能想起的上一两个关键节点到当下，时间感要可核对。",
    likelyCauseFocus:
      "主客观中哪一类最像卦中突出之象，用可观察情境表述，少用纯心理词。",
  },
};

type Rule = {
  kind: PrecheckQuestionKind;
  test: (q: string) => boolean;
};

/** 先匹配更具体的类型，避免被宽泛规则抢走 */
const CLASSIFY_RULES: Rule[] = [
  {
    kind: "reunion",
    test: (q) =>
      /复合|挽回|和好|重归于好|回头|原谅|还能在一起|能不能和好|会否回头/i.test(
        q
      ),
  },
  {
    kind: "job",
    test: (q) =>
      /求职|应聘|找工作|换工作|跳槽|离职|辞职|失业|空窗|新工作|入职|录用|offer|何时.*工作|什么时候.*工作|多久.*工作|能不能找到工作|能找到工作/i.test(
        q
      ),
  },
  {
    kind: "product",
    test: (q) =>
      /产品.*(?:上线|发布|发版)|项目.*(?:上线|发布|发版)|(?:上线|发布|发版).*(?:产品|功能|版本)|小程序.*(?:上线|发布)|APP.*(?:上线|发布|上架)|内测|公测|灰度|迭代|发版日|版本.*(?:如何|好不好)/i.test(
        q
      ),
  },
  {
    kind: "exam",
    test: (q) =>
      /考试|考研|公考|雅思|托福|托业|高考|中考|期末|笔试|面试.*(学校|研|校)|上岸|能否考上|能过吗|成绩|资格证|司考|法考/i.test(
        q
      ),
  },
  {
    kind: "cooperation",
    test: (q) =>
      /合作|合伙|签约|签合同|项目推进|洽谈|谈判|甲方|乙方|招商|联名|共建/i.test(
        q
      ),
  },
  {
    kind: "finance",
    test: (q) =>
      /财|钱|投资|理财|借贷|欠债|欠款|还款|股票|基金|盈亏|周转|债务|贷款|收入|破财|涨薪|降薪/i.test(
        q
      ),
  },
  {
    kind: "career",
    test: (q) =>
      /升职|晋升|加薪升职|调岗|上司|领导.*我|同事.*关系|裁员|办公室政治|绩效考核|述职/i.test(
        q
      ),
  },
  {
    kind: "relationship",
    test: (q) =>
      /感情|恋爱|分手|喜欢|对象|男友|女友|男朋友|女朋友|暧昧|结婚|婚姻|离婚|出轨|第三者|他会不会|她会不会|联系我|回我消息|冷淡|拉黑/i.test(
        q
      ),
  },
];

export function classifyPrecheckQuestion(question: string): PrecheckQuestionProfile {
  const q = question.trim();
  for (const rule of CLASSIFY_RULES) {
    if (rule.test(q)) {
      return { kind: rule.kind, ...PROFILES[rule.kind] };
    }
  }
  return { kind: "general", ...PROFILES.general };
}

/** 注入 LLM 用户提示，勿包含需对用户保密的内部实现细节时可省略 kind */
export function formatPrecheckProfileForPrompt(
  profile: PrecheckQuestionProfile
): string {
  const dims = profile.priorityValidationDimensions
    .map((d, i) => `${i + 1}. ${d}`)
    .join("\n");
  const angles = profile.suggestedAngles.map((a, i) => `${i + 1}. ${a}`).join("\n");

  return `
【问题类型（系统据用户原话初判，请你再对照原文细辨，勿在输出中提及「类型」「代码」等字样）】
${profile.labelZh}

【本类问题优先核验的前情维度】
请紧扣用户所问之事，从下列维度中择要展开（不必逐条写全，但须明显体现「在验与用户问题直接相关的前情」）：
${dims}

【时间线侧重】
${profile.keyTimelineFocus}

【诱因侧重】
${profile.likelyCauseFocus}

【切入角度参考】（融入叙述，勿机械罗列）
${angles}

【可核验输出要求（全文必须满足）】
让用户能逐句判断「这句对 / 这句不对」，不得以笼统玄学腔代替前情核对。
至少落实以下四类中的多数，且须与「用户原问题」同一主题：①时间或阶段（如近来、数周内、上一轮节点之后等，可留分寸）；②已发生的具体事件或动作；③卡点或诱因更像哪一类；④当前处于哪一进度（如已投递未回、已测未发等）。
禁止用空泛句单独充当前半段主体；每一类抽象概括后，尽量紧跟可对照生活的具体内容。
`.trim();
}

/** 供 prompt 引用的禁句倾向说明（模型可见） */
export const PRECHECK_VAGUE_PHRASING_BAN = `
【严禁作为主体的大量套话倾向】
除非同一自然段内立刻跟上非常具体、可核对的前情，否则不要使用或尽量少用下列及同类表述：
「并非凭空起念」「经过一段时间酝酿」「酝酿已久」「此事已推进多时」「你对此投入了不少心力」「事情并非突然出现」「并不是突然」「你内心波动/焦虑/反复」「目前处于推进与等待并存」「心中已有某种判断」「整体氛围」「某种反复」等放之四海皆准的心理或状态句。
尤其禁止以「并非凭空起念、已有酝酿」一类句子开篇或占大半篇幅——那不是验证，是铺垫。

【优先写出的句子类型】
可核对的时间段；已发生的实际变化；用户是否已做某动作；是否经历中断、拖延、返工、搁置、重启；卡点更像资源、他人态度、时间窗还是质量与细节未定。
`.trim();
