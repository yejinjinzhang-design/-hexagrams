import { NextResponse } from "next/server";
import { getSessionById, updateSession } from "@/lib/storage/mock";
import {
  classifyPrecheckQuestion,
  formatPrecheckProfileForPrompt,
  PRECHECK_VAGUE_PHRASING_BAN,
} from "@/lib/divination/precheck-question-profile";
import { LEAD_LAYER_PROSE_STYLE_BLOCK } from "@/lib/divination/lead-layer-prose-style";
import {
  fallbackPreCheckFromRaw,
  formatPreCheckForAnalysis,
  parsePrecheckStructuredContent,
} from "@/lib/divination/precheck-structured";
import type { YaoLineBoard } from "@/types/liuyao-board";
import type {
  DivinationPipelineTrace,
  PreCheckStructuredResult,
} from "@/lib/storage/types";
import { buildBoardFactSheet } from "@/lib/analysis/board-facts";
import { orchestratePrecheckLlm } from "@/lib/analysis/orchestrator";
import { LIUYAO_READING_ORDER_GUIDE } from "@/lib/analysis/prompts";
import { formatLiuyaoKnowledgeForPrompt } from "@/lib/knowledge/liuyao-local-rules";
import { isDeepseekConfigured } from "@/lib/llm/deepseek";
import { isGeminiConfigured } from "@/lib/llm/gemini";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    console.log("PRECHECK raw body:", body);
    const sessionId = body.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { text: "未能识别本次占卦会话，请返回重新起卦。" },
        { status: 400 }
      );
    }

    const session = await getSessionById(sessionId);

    if (!session || !session.board) {
      console.error("Session not found for sessionId:", sessionId);
      return NextResponse.json(
        {
          text:
            "本次卦象会话已失效或不在当前服务器上，请重新起卦后再试。",
        },
        { status: 404 }
      );
    }

    const { userInput, board } = session;
    const { benGua, bianGua, meta } = board;
    const movingLines = session.divination.movingLines;
    const boardFacts = buildBoardFactSheet(board, movingLines);
    const isKongBranch = (branch: string | undefined) =>
      Boolean(branch && meta.dayXunKong.includes(branch));

    const lineToText = (line: YaoLineBoard) => {
      const parts: string[] = [];
      parts.push(`第 ${line.index} 爻`);
      if (line.sixGod) parts.push(line.sixGod);
      if (line.liuQin) parts.push(line.liuQin);
      parts.push(`${line.stem}${line.branch}${line.fiveElement}`);
      if (line.shiYing === "世") parts.push("为世");
      if (line.shiYing === "应") parts.push("为应");
      if (line.moving) parts.push("发动");
      if (isKongBranch(line.branch)) parts.push(`日空：${line.branch}空`);
      if (line.fuShen) {
        parts.push(
          `伏神：${line.fuShen.liuQin}${line.fuShen.stem}${line.fuShen.branch}${line.fuShen.fiveElement}${
            isKongBranch(line.fuShen.branch) ? `（${line.fuShen.branch}空）` : ""
          }`
        );
      }
      return parts.join("，");
    };

    const benLines = [...benGua.lines]
      .sort((a, b) => b.index - a.index)
      .map(lineToText)
      .join("\n");

    const questionProfile = classifyPrecheckQuestion(userInput.question);
    const profileBlock = formatPrecheckProfileForPrompt(questionProfile);
    const knowledgeBlock = formatLiuyaoKnowledgeForPrompt({
      board,
      question: userInput.question,
    });

    const system = `
你是一位精通六爻断卦的老师傅。
你当前的任务不是泛泛解释卦象，也不是强行让卦去回答用户原问；而是先把这张卦本身读懂，再判断它与用户所问是否相应。
请优先输出用户可以核对的内容，例如时间段、已发生的事件、当前所处阶段、导致局面如此的主要原因、心态与隐情状态（指出更像哪一类，而非只说「有阻碍」）。
避免使用空泛、抽象、谁都适用的表述。除非必要，不要写「并非凭空起念」「酝酿已久」「投入心力」「并不是突然」「心中焦虑反复」「推进与等待并存」这类无效套话。
你的验证必须让用户能判断哪些说中了、哪些需要修正；宁可具体而偶需修正，也不要整段无法对证的空话。若卦象主轴不直接回应原问题，也要如实指出卦更像在显什么状态。

${PRECHECK_VAGUE_PHRASING_BAN}

【生成原则】
优先具体，后讲抽象；优先读卦中最强的世应动、六亲、六神状态，再判断它能否回扣用户所问；不要为了贴题而忽略卦中明显的心虚、隐情、拖延、口舌、旧事牵连、压力冲突等状态。
每一个「状态」判断，都要尽量用可观察情境落地（例如已投递、已面谈、已延期一次、对方已读不回、口头说法与实际凭据不一致、心里有虚处怕被追问等），再用卦爻收束依据。

${LIUYAO_READING_ORDER_GUIDE}

【工作类问题取用专则】
若用户所问属于求职、工作、离职、跳槽、offer、岗位、上级、项目或职业变动，验证前事时必须先判断本卦有没有“工作之象”，不可一上来只写情绪或笼统阻碍。
取用次序为：先看官鬼，官鬼主岗位、职责、录用、上级、压力、制度与工作本体；再看父母，父母主合同、offer、文书、流程、资质、通知、凭据与保护层；再看世爻代表求测者当前状态，应爻代表公司、岗位、对接方或外部环境；最后看动爻如何冲合生克官鬼、父母、世应。
若官鬼不显、官鬼受克、空亡、伏藏，或父母空破受克，须优先核验“当前是否没有稳定工作、岗位未实、录用/合同/流程没有落地、工作名分或保护层不稳”。若财爻发动或成势而克制父母，即财坏父母，不要只写“利益影响文书”，在问工作时要先考虑：现实利益、薪资资源、生活压力或个人取舍冲掉了岗位凭据与流程保护，常可对应无工作、离职后空窗、offer不稳、入职手续未成、合同/证明不足，或明面有说法但实际没有落到工作名分上。
这些判断仍须看旺衰、月日、动化、世应承受关系，不可机械套断；但若卦中此象明显，要先把它读出来，再继续分析原因、阶段与后续验证点。

【核心目标】
最值得先核对的是：这张卦最明显在显什么。它可能正面回应「用户原问题」，也可能先显出问卦者/对方/环境中的另一层状态，如心虚、隐情、怕被追问、文书凭据不足、口舌消息、旧事拖住、压力冲突等。
包括可核验的时间感、阶段感、诱因类别、已采取或未落地的行动、心理与隐情状态——能贴着问题就贴着问题说；若不完全贴题，应说明卦象更像先说哪一层。

【重要约束】
只根据当前这张卦象与用户所问的问题来判断，不可脱离卦象空谈；但不可为了迎合问题而扭曲卦象，卦不直答所问时须如实说明；
不允许预测最终结果，不下「成/不成」之断语；
每一则推验须能指回卦中具体爻象（世应、动爻、六亲、六神、日月对用神等），但表述上要以「可核对的前情」为主干；
语气留有余地，勿说满、勿武断具体日期或铁口直断。

【说话风格】
整体用现代书面中文：清楚、克制、好读；像认真把卦理说清楚，而不是仿古文评注或聊天碎嘴。
具体性不可废；忌网络套话、忌过度口语（如「就是说」「其实就是」）；亦忌为求古意而艰涩堆叠、赋体长铺。
不要用「验证点一、验证点二」式列举，不要像客服机器人。

${LEAD_LAYER_PROSE_STYLE_BLOCK}

【三层分工（必须严格遵守）】
1）plainValidationSummary（页首第一折，页面上标题为「先观其应」——前情总览，非一句话摘要）：此层须为一至两段、信息密度明显偏高的总览，使用户不读后文亦能把握前情大意七八成；文风必须严格遵守上文【第一折书面语体】：中短句、一句一义、勿超长复句黏连。底层判断必须先来自世、应、动爻的作用关系，再翻译成普通人事语汇；此层禁止出现世、应、动爻、生克、父母、官鬼、子孙、兄弟等术数专名及干支组合，但不可脱离这些爻象只谈卦名气氛。须自然融贯下列维度之多者（语气连贯即可，勿列「其一其二」，勿写总结如下式条目）：①卦中最明显的状态或隐情是什么，是否直接回应原问题；②此事此前整体已推进到何地步、当下真实处境约如何；③更似起念、筹备、推进、搁置、等待、反复、心虚遮掩或临门未定等哪一阶，须具体；④时间节奏与卡点类别；⑤途中更可能出现的具体情节，勿只云「有碍」；⑥内因与外缘何者偏显；⑦为何会问到眼下这一步。全文汉字宜在三百二十字以上，至少两段、每段内仍须断句清楚；末句谦请对方酌合所历，暗示若相应再论其后（仍勿对最终结果下死断、勿展开未来详断）。
2）reasoningExplanation（对应「再明其理」）：承上一层所陈，解释卦中何以映出此等局面；必须先说明世、应、动爻各代表哪一方/哪类事，以及它们的生克冲合、动化或空伏如何构成当前前情。随后再用六亲与六神/六兽解释状态，例如某六神临世应或动爻为何表现为迟滞、疑惧、口舌、隐情、压力或体面资源。本层须有承转，篇幅不宜单薄，宜在约一百六十汉字以上，勿作名词堆砌。
3）technicalInterpretation（对应「细参卦旨」）：缕析术数依据，须优先直言世应、动爻、六亲作用、六神状态、月建日辰、化象与五行生克。须分节书之：每节以四字或五字内简短小题为引（勿生僻）；小节题目须依本卦与所问灵活酌定，可从「世应动机」「六亲作用」「六神状态」「本变之机」「时机与节候」「阻碍与外援」等中择要而书，至少一节要正面解释世应动爻关系；正文仍以说清楚为主，勿仿古文评注体。题后换行再述，节与节之间宜空一行；全层宜在约二百字以上，务求条畅，勿并为一整块密文。

【输出格式硬性要求（极其重要）】
你必须只输出一个 JSON 对象，不要 markdown 代码围栏，不要前后解释语。
JSON 有且仅有三个字符串字段，键名必须完全一致：
plainValidationSummary、reasoningExplanation、technicalInterpretation
三个字段的值均为普通中文文本字符串；字符串内不要使用 markdown、不要使用 #、**、列表符号；如需分段只用换行；第三层节与节之间宜空一行，以便展读。
`.trim();

    const userPrompt = `
【用户问题】
${userInput.question}

${profileBlock}

${boardFacts}

${knowledgeBlock}

【基础信息】
- 出生年份：${userInput.birthYear}
- 性别：${userInput.gender}
- 起卦时间：${meta.solarDate}（农历：${meta.lunarDate}）
- 四柱：${meta.yearPillar} ${meta.monthPillar} ${meta.dayPillar} ${meta.hourPillar}
- 日空：${meta.dayXunKong}

【卦象概要】
- 本卦：${benGua.name}（${benGua.palace}）
- 变卦：${
      bianGua ? `${bianGua.name}（${bianGua.palace}）` : "无变卦"
    }
- 动爻：${
      movingLines.length ? movingLines.join("、") + " 爻动" : "无动爻"
    }
- 世爻位置：第 ${benGua.shiPosition || "（未标）"} 爻
- 应爻位置：第 ${benGua.yingPosition || "（未标）"} 爻

【六爻明细（自上而下）】
${benLines}

【卦象运用方式】
读卦须支撑「可核对的前情」，而非堆砌术语。必须先从世爻、应爻、动爻的作用关系判断此事在讲什么，再用六亲生克翻译成人事含义，最后看六神/六兽临何爻以定状态与表现。卦名、本变、月日可辅助收束，但不可取代世应动这个主轴。相关判断须融入各层叙述，勿向用户逐条宣读 checklist。

【第一折专嘱（plainValidationSummary）】
此折不是总论一句带过，而是「先观其应」式的前情总览：先把世应动的作用关系转成人事主轴，再落到与用户所问最相干之关节；可用卦名与本变辅助成文，但不能以整卦气氛代替爻象判断。篇幅与信息须明显厚于旧版短文；并须完全遵守【第一折书面语体】，以普通用户能顺畅读完为先。

【生成步骤（内化执行，勿向用户展示步骤名）】
Step 1：从用户原话中把握核心主题，但不要预设卦一定正面回答此主题。
Step 2：若是工作类问题，先取官鬼、父母为用，看有没有岗位、录用、合同、流程、凭据与保护层之象；再查这些用神是否空伏、受克、被财坏、被兄弟竞夺或被动爻冲动。
Step 3：再查世、应、动爻各临何六亲、六神，彼此是否生克冲合刑害，动化后是否回头生克、化进退、入空伏藏。
Step 4：由这些作用关系先判断「这张卦在讲什么」，包括可能不完全围绕原问题的状态；再对照上文「本类问题优先核验的前情维度」与「可核验输出要求」，选出最该让用户先对号入座的若干条作为叙述主轴。
Step 5：用卦象支撑每一条具体前情推验；禁止用「已有酝酿」「非初念」等空句代替爻象依据。

【验收标准（生成前自检，勿输出自检文字）】
须先完成核卦：卦名、变卦、动爻、世应、六亲干支、伏神、空亡必须与「核卦清单」一致。
正文中须能找出：至少一则较具体的时间或阶段判断；至少一则较具体的诱因或卡点类别判断；至少一则卦中明显状态的细读（如心虚、隐情、口舌、拖滞、压力、文书凭据等）。若与用户原问题高度相关，要明确回扣；若不完全相关，要说明卦象更像先显何事。
若删去所有卦爻术语后，仍有一半以上内容对任何求测者都成立，则视为不合格，须改写得更贴题、更具体。

【表达方式要求】
三层辞气须一脉相承：先应后理再细参，如展卷次第；勿在正文中自称「第一层」「结论版」「通俗版」等。不要「第一点、第二点」式列举（JSON 字段内部亦然）。

【禁止做的事】
不要预测最终结果，不要说「一定能成 / 一定不成」；
不要提前给出完整的未来走势分析；
不要以心理描写或泛状态句作为段落主体；
不要只复述卦名卦象；也不要为了贴用户原问题而忽略卦中更明显的状态；
不要在 plainValidationSummary 里写术数专名；
禁止使用「大白话」「白话」「口语版」「专业版」「术数版」「点击展开」等露骨分层用语。

【输出要求】
只输出上述 JSON 对象这一行（或可读的紧凑 JSON），不要其它字符。
三个字段都不得为空字符串，且须满足上文对各层最低篇幅之要求；宁可稍长而气脉完足，勿三言两语草草收场。
`.trim();

    const divinationDataForLog = {
      precheckQuestionKind: questionProfile.kind,
      precheckQuestionLabel: questionProfile.labelZh,
      userInput,
      meta,
      benGua: {
        name: benGua.name,
        palace: benGua.palace,
        shiPosition: benGua.shiPosition,
        yingPosition: benGua.yingPosition,
      },
      movingLines,
    };

    console.log("==== PRECHECK INPUT ====");
    console.log(JSON.stringify(divinationDataForLog, null, 2));

    console.log("==== SYSTEM PROMPT ====");
    console.log(system);

    console.log("==== USER PROMPT ====");
    console.log(userPrompt);

    if (!isDeepseekConfigured() && !isGeminiConfigured()) {
      return NextResponse.json({
        text: "前事验证服务未配置，请联系管理员配置 DEEPSEEK_API_KEY 或 GEMINI_API_KEY。",
      });
    }

    let text = "";
    let auditSummary: string | undefined;
    let pipelineTrace: DivinationPipelineTrace | undefined;

    try {
      const out = await orchestratePrecheckLlm({
        system,
        user: userPrompt,
        userQuestion: userInput.question,
        boardFacts,
      });
      text = out.content.trim();
      auditSummary = out.auditSummary?.trim() || undefined;
      pipelineTrace = out.pipelineTrace;
    } catch (e) {
      console.error("[precheck] orchestrator error:", e);
      return NextResponse.json({
        text: "前事验证服务暂时不可用，请稍后重试。",
      });
    }

    if (!text) {
      console.error("[precheck] empty text from orchestrator");
      return NextResponse.json({
        text: "前事验证未返回有效内容，请稍后重试。",
      });
    }

    let structured: PreCheckStructuredResult =
      parsePrecheckStructuredContent(text) ?? fallbackPreCheckFromRaw(text);

    if (!structured.plainValidationSummary.trim()) {
      structured = fallbackPreCheckFromRaw(text);
    }

    const flatForAnalysis = formatPreCheckForAnalysis(structured);
    await updateSession(sessionId, {
      preCheckResult: structured,
      preCheckResultText: flatForAnalysis,
      ...(auditSummary ? { preCheckAuditSummary: auditSummary } : {}),
      ...(pipelineTrace?.steps?.length
        ? { preCheckPipelineTrace: pipelineTrace }
        : {}),
    });

    if (process.env.LOG_MULTIMODEL_DETAIL === "1") {
      console.info(
        "[pipeline-trace] precheck session=",
        sessionId,
        JSON.stringify({ auditSummary, pipelineTrace }, null, 2)
      );
    }

    return NextResponse.json({
      preCheck: structured,
      text: structured.plainValidationSummary,
    });
  } catch (error) {
    console.error("[precheck] handler error:", error);
    return NextResponse.json(
      { text: "前事验证处理出错，请稍后重试。" },
      { status: 500 }
    );
  }
}


