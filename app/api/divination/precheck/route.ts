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
import type { PreCheckStructuredResult } from "@/lib/storage/types";

export const runtime = "nodejs";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.error("[precheck] Missing DeepSeek API Key (DEEPSEEK_API_KEY)");
    throw new Error("DEEPSEEK_API_KEY 未配置，请在 .env.local 中设置");
  }
  return key;
}

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

    const lineToText = (line: YaoLineBoard) => {
      const parts: string[] = [];
      parts.push(`第 ${line.index} 爻`);
      if (line.sixGod) parts.push(line.sixGod);
      if (line.liuQin) parts.push(line.liuQin);
      parts.push(`${line.stem}${line.branch}${line.fiveElement}`);
      if (line.shiYing === "世") parts.push("为世");
      if (line.shiYing === "应") parts.push("为应");
      if (line.moving) parts.push("发动");
      if (line.fuShen) {
        parts.push(
          `伏神：${line.fuShen.liuQin}${line.fuShen.stem}${line.fuShen.branch}${line.fuShen.fiveElement}`
        );
      }
      return parts.join("，");
    };

    const benLines = [...benGua.lines]
      .sort((a, b) => b.index - a.index)
      .map(lineToText)
      .join("\n");

    const movingLines = session.divination.movingLines;

    const questionProfile = classifyPrecheckQuestion(userInput.question);
    const profileBlock = formatPrecheckProfileForPrompt(questionProfile);

    const system = `
你是一位精通六爻断卦的老师傅。
你当前的任务不是泛泛解释卦象，而是先围绕用户所问之事，尽可能验证已经发生的具体前情。
请优先输出用户可以核对的内容，例如时间段、已发生的事件、当前所处阶段、导致局面如此的主要原因（指出更像哪一类，而非只说「有阻碍」）。
避免使用空泛、抽象、谁都适用的表述。除非必要，不要写「并非凭空起念」「酝酿已久」「投入心力」「并不是突然」「心中焦虑反复」「推进与等待并存」这类无效套话。
你的验证必须让用户能判断哪些说中了、哪些需要修正；宁可具体而偶需修正，也不要整段无法对证的空话。

${PRECHECK_VAGUE_PHRASING_BAN}

【生成原则】
优先具体，后讲抽象；优先验证事件与节点，后讲情绪与氛围；优先围绕用户所问之事本身，不要离题讲泛状态。
每一个「状态」判断，尽量用可观察情境落地（例如已投递、已面谈、已延期一次、对方已读不回等），再用卦爻收束依据。

【核心目标】
最值得先核对的是：与「用户原问题」同一主题下，已经发生了什么、大致从何时起变得关键、当下卡在哪一类环节。
包括可核验的时间感、阶段感、诱因类别、已采取或未落地的行动——均须尽量贴着问题，而非泛泛论卦气。

【重要约束】
只根据当前这张卦象与用户所问的问题来判断，不可脱离卦象空谈；
不允许预测最终结果，不下「成/不成」之断语；
每一则推验须能指回卦中具体爻象（世应、动爻、六亲、六神、日月对用神等），但表述上要以「可核对的前情」为主干；
语气留有余地，勿说满、勿武断具体日期或铁口直断。

【说话风格】
整体用现代书面中文：清楚、克制、好读；像认真把卦理说清楚，而不是仿古文评注或聊天碎嘴。
具体性不可废；忌网络套话、忌过度口语（如「就是说」「其实就是」）；亦忌为求古意而艰涩堆叠、赋体长铺。
不要用「验证点一、验证点二」式列举，不要像客服机器人。

${LEAD_LAYER_PROSE_STYLE_BLOCK}

【三层分工（必须严格遵守）】
1）plainValidationSummary（页首第一折，页面上标题为「先观其应」——前情总览，非一句话摘要）：此层须为一至两段、信息密度明显偏高的总览，使用户不读后文亦能把握前情大意七八成；文风必须严格遵守上文【第一折书面语体】：中短句、一句一义、勿超长复句黏连。优先从整卦层面用人事语汇写出：本卦整体气质、卦名与取象在所问之事上的意味、有无变卦时前情已如何转向或蓄势——不必先拆到某一爻，亦禁止出现世、应、动爻、生克、父母、官鬼、子孙、兄弟等术数专名及干支组合。须自然融贯下列维度之多者（语气连贯即可，勿列「其一其二」，勿写总结如下式条目）：①此事此前整体已推进到何地步、当下真实处境约如何；②更似起念、筹备、推进、搁置、等待、反复或临门未定等哪一阶，须具体；③时间节奏（已历多久、近段有无动静、卡点更像补件、流程、对方迟滞、内部协调、标准牵制等哪一类）；④途中更可能出现的具体情节，勿只云「有碍」；⑤内因与外缘何者偏显；⑥为何会问到眼下这一步。全文汉字宜在三百二十字以上，至少两段、每段内仍须断句清楚；末句谦请对方酌合所历，暗示若相应再论其后（仍勿对最终结果下死断、勿展开未来详断）。
2）reasoningExplanation（对应「再明其理」）：承上一层所陈，解释卦中何以映出此等局面；仍以清楚现代书面语为主，可间用爻象名目，但每出一词须随接一两句人能听懂的话，勿仿古文连缀。本层须有承转，篇幅不宜单薄，宜在约一百六十汉字以上，勿作名词堆砌。
3）technicalInterpretation（对应「细参卦旨」）：缕析术数依据，可直言动爻、世应、月建、日辰、化象、五行生克等。须分节书之：每节以四字或五字内简短小题为引（勿生僻）；小节题目须依本卦与所问灵活酌定，可从「卦象大意」「卦名取象」「本变之机」「世应与人事」「动爻与变机」「时机与节候」「阻碍与外援」等中择要而书，不必套用固定顺序，亦不必节节课写全；正文仍以说清楚为主，勿仿古文评注体。题后换行再述，节与节之间宜空一行；全层宜在约二百字以上，务求条畅，勿并为一整块密文。

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
读卦须支撑「可核对的前情」，而非堆砌术语。切入顺序不必固定：若大象或卦名已足照见处境，可先从此落笔；若本变对比最显前因后果，可由此说起；若世应最关人我，可侧重人事；若动爻最显近日变化，亦可从变机入手。世应、动爻、月日、六亲、六神、五行生克等，择与本卦及用户之问最相干涉者用之，融入各层叙述，勿向用户逐条宣读 checklist。

【第一折专嘱（plainValidationSummary）】
此折不是总论一句带过，而是「先观其应」式的前情总览：先整卦取意、再落到与用户所问最相干之关节，篇幅与信息须明显厚于旧版短文；并须完全遵守【第一折书面语体】，以普通用户能顺畅读完为先。

【生成步骤（内化执行，勿向用户展示步骤名）】
Step 1：从用户原话中把握核心主题（与所问完全同一件事）。
Step 2：对照上文「本类问题优先核验的前情维度」与「可核验输出要求」，选出最该让用户先对号入座的若干条作为叙述主轴。
Step 3：用卦象支撑每一条具体前情推验；禁止用「已有酝酿」「非初念」等空句代替 Step 3。

【验收标准（生成前自检，勿输出自检文字）】
正文中须能找出：至少一则较具体的时间或阶段判断；至少一则较具体的诱因或卡点类别判断；至少一则与用户原问题高度相关的已发生事实推测。
若删去所有卦爻术语后，仍有一半以上内容对任何求测者都成立，则视为不合格，须改写得更贴题、更具体。

【表达方式要求】
三层辞气须一脉相承：先应后理再细参，如展卷次第；勿在正文中自称「第一层」「结论版」「通俗版」等。不要「第一点、第二点」式列举（JSON 字段内部亦然）。

【禁止做的事】
不要预测最终结果，不要说「一定能成 / 一定不成」；
不要提前给出完整的未来走势分析；
不要以心理描写或泛状态句作为段落主体；
不要脱离用户原问题只复述卦名卦象；
不要在 plainValidationSummary 里写术数专名；
禁止使用「大白话」「白话」「口语版」「专业版」「术数版」「点击展开」等露骨分层用语。

【输出要求】
只输出上述 JSON 对象这一行（或可读的紧凑 JSON），不要其它字符。
三个字段都不得为空字符串，且须满足上文对各层最低篇幅之要求；宁可稍长而气脉完足，勿三言两语草草收场。
`.trim();

    const deepseekBody = {
      model: "deepseek-chat",
      messages: [
        { role: "system" as const, content: system },
        { role: "user" as const, content: userPrompt },
      ],
      ...(process.env.DEEPSEEK_JSON_MODE === "1"
        ? { response_format: { type: "json_object" as const } }
        : {}),
    };

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

    let text = "";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);

      console.log("PRECHECK DeepSeek URL:", DEEPSEEK_URL);
      console.log("PRECHECK DeepSeek model:", deepseekBody.model);
      console.log(
        "PRECHECK DeepSeek messages length:",
        deepseekBody.messages.length
      );

      const res = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify(deepseekBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const raw = await res.text();

      console.log("==== PRECHECK RAW RESPONSE ====");
      console.log(raw);

      if (!res.ok) {
        console.error(
          "[precheck] DeepSeek HTTP error:",
          res.status,
          res.statusText,
          raw
        );
        return NextResponse.json({
          text: "前事验证服务暂时不可用，请稍后重试。",
        });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error("[precheck] Failed to parse DeepSeek JSON:", e);
        return NextResponse.json({
          text: "前事验证返回异常，请稍后重试。",
        });
      }

      console.log("==== PRECHECK PARSED RESPONSE ====");
      console.log(JSON.stringify(parsed, null, 2));

      if (
        !parsed ||
        !Array.isArray(parsed.choices) ||
        !parsed.choices[0] ||
        !parsed.choices[0].message ||
        typeof parsed.choices[0].message.content !== "string"
      ) {
        console.error("DeepSeek response invalid:", parsed);
        return NextResponse.json({
          text: "前事验证未返回有效内容，请稍后重试。",
        });
      }

      text = parsed.choices[0].message.content.trim();
    } catch (error) {
      console.error("DeepSeek ERROR:", error);
      return NextResponse.json({
        text: "接口调用失败，请查看后端日志",
      });
    }

    if (!text) {
      console.error("[precheck] empty text from DeepSeek");
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
    });

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


