import type { ProjectInput } from "./schema";
export const demoInput: ProjectInput = {
  title: "开往明天的末班车",
  idea: "毕业前夜，林夏在一座即将拆除的车站，捡到一张写着「明天」的旧车票。她登上末班车，遇见了十年后的自己。她终于明白：未来不是一道标准答案，而是此刻愿意迈出的一步。",
  style: "电影日漫",
  ratio: "16:9",
  characters: [
    {
      id: "linxia",
      name: "林夏",
      description:
        "22 岁，黑色齐耳短发，米白色风衣，芥末黄色单肩包。性格细腻，对毕业后的生活感到迷茫。全片保持同一发型、服装和配色。",
      color: "#ed8b4c",
    },
    {
      id: "future",
      name: "未来的自己",
      description:
        "32 岁的林夏，短发依旧，神情更从容。以车窗中的倒影出现，佩戴一只黄铜怀表。",
      color: "#689b99",
    },
  ],
  shots: [
    {
      id: "scene-1",
      title: "黄昏的站台",
      description:
        "远景。暮色中的高架车站，林夏独自站在站台边，手心里是一张微微发光的旧车票。青绿色列车从远方驶来。",
      narration: "毕业那晚，我捡到一张奇怪的车票。终点站，叫作明天。",
      imagePrompt:
        "电影感日漫，22岁中国女孩，黑色齐耳短发，米白风衣，芥末黄单肩包，黄昏高架站台，手持发光车票，青绿复古列车，蓝绿阴影和桃色暮光，无文字。",
      duration: 7,
      camera: "缓慢推进",
      imageUrl: "/demo/station.png",
      imageSource: "demo",
    },
    {
      id: "scene-2",
      title: "车窗里的来客",
      description:
        "中近景。车厢里，林夏望向车窗。窗外的城市渐渐变成云海，玻璃上映出更成熟的自己。",
      narration: "车窗里的人忽然笑了。她说，别怕，我就是十年后的你。",
      imagePrompt:
        "电影感日漫，黑色短发女孩坐在青绿复古列车窗边，米白色风衣，黄色单肩包，玻璃倒影，窗外桃色云海，暖色车厢灯光，无文字。",
      duration: 7,
      camera: "缓慢拉远",
      imageUrl: "/demo/window.png",
      imageSource: "demo",
    },
    {
      id: "scene-3",
      title: "没有标准答案",
      description:
        "特写。林夏低头看着掌心的黄铜怀表。指针没有数字，只有一只振翅的小鸟。她终于放松了紧握的手。",
      narration: "我问她，后来一切都好吗？她把怀表递给我：你会找到自己的时间。",
      imagePrompt:
        "日漫特写，黑色短发年轻女孩低头凝视发光黄铜怀表，米白风衣袖口，柔和暖光，列车窗外梦幻云海，精致线条，无文字。",
      duration: 8,
      camera: "缓慢推进",
      imageUrl: "/demo/window.png",
      imageSource: "demo",
    },
    {
      id: "scene-4",
      title: "下一站，出发",
      description:
        "大全景。清晨的海边车站。林夏走下列车，车票变成一只橙色的小鸟，飞向金色的海面。她笑着迈出第一步。",
      narration: "天亮时，车票变成了一只鸟。我没有得到答案，却终于愿意出发。",
      imagePrompt:
        "电影感日漫，短发女孩米白风衣黄色单肩包走下青绿列车，清晨海边车站，橙色发光小鸟从手心飞起，金桃色日出，蓝绿阴影，希望感，无文字。",
      duration: 8,
      camera: "缓慢拉远",
      imageUrl: "/demo/sunrise.png",
      imageSource: "demo",
    },
  ],
};
