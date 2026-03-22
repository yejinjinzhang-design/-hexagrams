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
      "区分「刚离开不久」「空窗已有一段」「有面无果」「机会悬而未决」等阶段感",
      "原因感可与卦中刑冲合害、兄弟竞夺、官鬼受制等相呼应，但话术要紧贴所问",
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
      "先对照用户所问（如能否和好、对方心意、是否值得继续）点名最该核对的「已发生」情节",
      "再用应爻、世爻、财官、动爻说明卦气何以映出此等局面",
      "避免只讲「心绪不宁」类空话，要有可对照的生活层面描述",
    ],
    keyTimelineFocus:
      "关系由热转冷、由近转疏的关键转折大致落在什么阶段。",
    likelyCauseFocus:
      "现实条件、家庭或社交圈、第三者阴影、沟通方式、承诺与期待的落差。",
  },
  reunion: {
    labelZh: "复合 / 挽回 / 和好",
    priorityValidationDimensions: [
      "分开或明显疏远之前，是否已有较长酝酿（非一日之寒）",
      "断联或冷淡是突然加剧还是逐步滑落",
      "挽回意愿在一侧还是双侧，是否仍有零星联系或完全沉默",
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
      "备考或应试是否已持续一段时日，而非临时起意",
      "此前是否有一次或多次失利、发挥失常、准备不足的经历",
      "当前更偏冲刺、等待放榜、复试面试前，还是尚在观望是否报考",
      "压力主要来自自律、家庭期望、竞争强度，还是基础薄弱",
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
      "矛盾或机会是否已酝酿多时，近期是否有公开或台面下的变化",
      "卡点更在时间、资源、派系、业绩认定，还是上级态度摇摆",
      "自己是否已采取争取、沟通、隐忍或寻找退路等行动",
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
      "资金压力或机会是突发还是已有一段积累",
      "涉及投资、借贷、经营周转或固定开支中的哪一类为主",
      "近期是否有亏损、回款拖延、口头承诺未兑现等情况",
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
  general: {
    labelZh: "综合 / 未细分类",
    priorityValidationDimensions: [
      "与用户原话直接相关的事，是否已推进一段时日而非单日起念",
      "当前处于犹豫、观望、已行动待果，还是遭遇明显阻滞",
      "途中是否可见反复、拖延、外力介入或贵人暗助等痕迹",
      "诱因更偏主观选择、客观条件，还是人际与环境交织",
    ],
    suggestedAngles: [
      "仍须先问：若用户此刻所问成立，最值得先核对的「已发生事实」是什么",
      "再以世应、动爻、用神生克铺陈卦象依据",
    ],
    keyTimelineFocus:
      "事情从萌芽到当下的大致阶段感，避免武断具体日期。",
    likelyCauseFocus:
      "主客观因素中，何者更似卦中突出之象，保留判断余地。",
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
`.trim();
}
