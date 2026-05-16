import { NextResponse } from "next/server";
import { buildPreAnalysisFeedbackSummary } from "@/lib/pre-analysis-feedback";
import {
  finalizePostAnalysisResult,
  formatPostAnalysisForContext,
  parsePostAnalysisStructuredContent,
} from "@/lib/divination/analysis-structured";
import { LEAD_LAYER_PROSE_STYLE_BLOCK } from "@/lib/divination/lead-layer-prose-style";
import { formatPreCheckForAnalysis } from "@/lib/divination/precheck-structured";
import { getSessionById, updateSession } from "@/lib/storage/mock";
import { sanitizeAiText } from "@/utils/sanitizeAiText";
import type { YaoLineBoard } from "@/types/liuyao-board";
import type {
  DivinationPipelineTrace,
  PostAnalysisStructuredResult,
} from "@/lib/storage/types";
import { buildBoardFactSheet } from "@/lib/analysis/board-facts";
import { orchestratePostAnalysisLlm } from "@/lib/analysis/orchestrator";
import { LIUYAO_READING_ORDER_GUIDE } from "@/lib/analysis/prompts";
import { isDeepseekConfigured } from "@/lib/llm/deepseek";
import { isGeminiConfigured } from "@/lib/llm/gemini";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    console.log("ANALYSIS raw body:", body);
    const sessionId = body.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { text: "卦意未尽显，可稍后再观" },
        { status: 400 }
      );
    }

    const session = await getSessionById(sessionId);

    if (!session || !session.board) {
      console.error("[analysis] Session not found for sessionId:", sessionId);
      return NextResponse.json(
        { text: "卦意未尽显，可稍后再观" },
        { status: 404 }
      );
    }

    const { userInput, board, divination } = session;
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

    const preCheckBlock =
      (session.preCheckResult
        ? formatPreCheckForAnalysis(session.preCheckResult).trim()
        : null) ||
      session.preCheckResultText?.trim() ||
      "（前事验证正文未单独缓存，仍以卦象与用户所问为纲。）";

    const feedbackBlockRaw = buildPreAnalysisFeedbackSummary(
      session.preAnalysisFeedback?.messages
    ).trim();
    const feedbackBlock =
      feedbackBlockRaw ||
      session.preAnalysisFeedback?.summary?.trim() ||
      "";

    const system = `
你是一位精通六爻断卦的老师傅。
此刻是在前象已验之后，细断此卦之后势与走向。你的首要任务是把卦读懂，而不是强行让卦迎合用户原问。

若用户提供了「对前事验证的补充与修正」且内容非空，须在全部分层中切实纳入，不可轻忽；那是为对齐现实而非更换问卜主题。仍须以本卦为准：能回扣原问题的回扣原问题；若卦象更明显在讲别的状态，也要如实说明。

【重要约束】
只根据当前卦象与用户所问来分析，不可脱离卦象空谈；但不可为了贴题而扭曲卦象，卦不直答所问时须如实说明；
勿用「一定」「必然」等绝对语气，可用「多半」「大致」「似」「需留意」等克制表述；
吉凶与可行应对须兼顾，勿单面讨好或单面恫吓。

${LIUYAO_READING_ORDER_GUIDE}

【说话风格】
以现代书面中文为主：清楚、克制、好读；把卦理与后势说明白，而不是仿古文评注或聊天碎嘴。
勿用「第一点、第二点」式编号；JSON 各字段内部也不要 markdown、不要 #、**、列表符号。

${LEAD_LAYER_PROSE_STYLE_BLOCK}

【分层职责（须由 JSON 三字段体现）】
1）summaryText（先陈其势——后势总览，非一两句空泛断语）：须一至两段、信息饱满而语句清楚（全文汉字宜在三百字以上），使用户不读后文亦能把握后势大意七八成；文风必须严格遵守上文【第一折书面语体】：中短句、一句一义、勿整段赋式黏连。底层判断必须先来自世、应、动爻的主客与变化关系，再转成普通用户能懂的人事语言；summaryText 可少用术语，但不得先泛泛谈卦名。须自然融贯下列维度之多者（语气连贯、分段清楚即可，勿列「1、2、3」，勿写「总结如下」）：①卦象最强主轴是什么，是否正面回应用户原问；②整体局势先定调（顺、缓、阻、反复、将成未成、可成而迟、眼下难定、外顺内滞、心虚隐情先显等，留分寸）；③当前阶段具体化（起念、筹备、推进、卡住、等待、反复、遮掩、补救、收口、临门未定等）；④时间节奏；⑤过程中更可能出现的现实情节（补材料、来回修改、等待批复、流程拖延、先近后搁、差最后一步、怕被追问、口径反复等），指类不武断；⑥内因与外缘何者偏显；⑦最终趋向，勿铁口。末可一句提醒与实事参证。
2）reasoningText：对应「再释其由」。以清楚现代书面语解释何以得出上一层判断；必须讲清最关键的世、应、动爻各代表谁/何事，以及它们之间的生克冲合或动化关系如何显示后势。随后要细看六亲、六神/六兽、五行旺衰、月日节候等具体状态，尤其要把腾蛇、玄武、朱雀、勾陈、白虎、青龙临世应动爻时的状态讲清楚；勿仿古文连缀。宜在约二百二十汉字以上。
3）detailedSections：对应「细参卦旨」。须为数组，含 3 至 5 个对象，每个对象有 title（短而稳的四五字内小标题，如「世应动机」「六亲作用」「六神状态」「火蛇之象」「阻碍所在」，勿生僻）与 content（该标题下一段完整分析，现代书面语、说清楚为主）。小标题须依本卦信息量灵活自拟，但至少一节要正面解释世、应、动爻关系，至少一节要细解六神/六兽与五行状态；若卦象主轴不直答用户问题，须有一节说明它更像在讲什么。

【输出格式硬性要求】
只输出一个 JSON 对象，不要代码围栏，不要前后赘语。
键名必须完全一致：summaryText（字符串）、reasoningText（字符串）、detailedSections（数组，元素为 { "title": "…", "content": "…" }）。
不得省略键；detailedSections 长度须在 3～5 之间；各 content 须为完整段落，可换行分段，勿堆砌无释之术语。
`.trim();

    const userPrompt = `
【用户问题】
${userInput.question}

${boardFacts}

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

【前事验证（先观应象）】
${preCheckBlock}

【用户对前事验证的补充与修正】
${
  feedbackBlock
    ? `以下内容为用户对前事验证结果的补充与修正，并非新的问卜主题。请将其作为本次卦象分析的附加上下文，在走势、关系、阻碍与建议中优先纳入，不可忽略。

${feedbackBlock}`
    : "（用户未另作补述，可仅以前验与卦象为准。）"
}

【六爻明细（自上而下）】
${benLines}

【分析提示（可择用，勿当作死板提纲）】
分析前必须先核卦：卦名、变卦、动爻、世应、六亲干支、伏神、空亡必须与「核卦清单」一致；凡清单没有支持的爻位事实，不得写成确定判断。
核卦后必须先做世、应、动三点定位：世爻临何六亲六神、应爻临何六亲六神、动爻临何六亲六神，三者之间如何生克冲合刑害，动化是否回头生克或改变人事方向。由此先判断此卦在讲什么，而不是先判断它应该如何回答用户问题。若卦象更明显在讲心虚、隐情、遮掩、口舌、拖滞、旧事、压力或文书凭据等状态，要先写出来，再判断它与原问如何相接。再酌取整体大象与卦名寓意、本卦与变卦「从何而至、向何而去」、月建日辰之助抑、节奏与应期之分寸。典故取象若有助于说清，亦可入文，但不可盖过世应动主轴。

【须覆盖之要旨（散见于各层，勿单列清单给用户）】
后势总体倾向与须警惕之处；卦中最强状态及其现实表现；趋利避害时可行的应对一二（融入叙述，勿写成操作手册条目）。

【先陈其势（summaryText）专嘱】
此字段不是一句话摘要，而是对整张卦的「大势总览」：先说卦象最强主轴，再说它如何对应或不完全对应用户原问，然后围绕整体局势、当前阶段、时间节奏、可能发生的现实情节、内外因素、最终趋向来写。判断根基必须先来自世应动爻及其作用关系，再转成自然人事语言；不必在此字段堆术语，但不能只从卦名、变卦或泛情绪切入。遣词造句须与【第一折书面语体】一致，优先让普通用户一遍读懂。

请输出符合系统说明的 JSON。
`.trim();

    const divinationDataForLog = {
      userInput,
      meta,
      benGua: {
        name: benGua.name,
        palace: benGua.palace,
        shiPosition: benGua.shiPosition,
        yingPosition: benGua.yingPosition,
      },
      movingLines,
      originalHexagram: divination.originalHexagram,
      changedHexagram: divination.changedHexagram,
    };

    console.log("==== ANALYSIS INPUT ====");
    console.log(JSON.stringify(divinationDataForLog, null, 2));

    console.log("==== ANALYSIS SYSTEM PROMPT ====");
    console.log(system);

    console.log("==== ANALYSIS USER PROMPT ====");
    console.log(userPrompt);

    if (!isDeepseekConfigured() && !isGeminiConfigured()) {
      return NextResponse.json({
        text: "卦意未尽显，可稍后再观",
      });
    }

    let text = "";
    let auditSummary: string | undefined;
    let pipelineTrace: DivinationPipelineTrace | undefined;

    try {
      const out = await orchestratePostAnalysisLlm({
        system,
        user: userPrompt,
        userQuestion: userInput.question,
        boardFacts,
      });
      text = out.content.trim();
      auditSummary = out.auditSummary?.trim() || undefined;
      pipelineTrace = out.pipelineTrace;
    } catch (e) {
      console.error("[analysis] orchestrator error:", e);
      return NextResponse.json({
        text: "卦意未尽显，可稍后再观",
      });
    }

    if (!text) {
      console.error("[analysis] empty text from orchestrator");
      return NextResponse.json({
        text: "卦意未尽显，可稍后再观",
      });
    }

    const parsedStruct = parsePostAnalysisStructuredContent(text);
    const structured: PostAnalysisStructuredResult = finalizePostAnalysisResult(
      parsedStruct,
      text
    );
    const flatText = formatPostAnalysisForContext(structured);
    const cleanFlat = sanitizeAiText(flatText);

    await updateSession(sessionId, {
      postAnalysisResult: structured,
      postAnalysisFlatText: cleanFlat,
      ...(auditSummary ? { postAnalysisAuditSummary: auditSummary } : {}),
      ...(pipelineTrace?.steps?.length
        ? { postAnalysisPipelineTrace: pipelineTrace }
        : {}),
    });

    if (process.env.LOG_MULTIMODEL_DETAIL === "1") {
      console.info(
        "[pipeline-trace] analysis session=",
        sessionId,
        JSON.stringify({ auditSummary, pipelineTrace }, null, 2)
      );
    }

    return NextResponse.json({
      analysis: structured,
      text: cleanFlat,
    });
  } catch (error) {
    console.error("[analysis] Unexpected ERROR:", error);
    return NextResponse.json({
      text: "卦意未尽显，可稍后再观",
    });
  }
}

