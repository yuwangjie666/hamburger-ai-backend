// 汉堡AI - 最终版后端（所有配置焊死）
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// ========== 核心配置（已全部焊死，无需修改） ==========
// 端口：Render自动分配，本地测试用3000
const PORT = process.env.PORT || 3000;
// 你的前端地址（后续部署时替换成你的GitHub Pages地址：http://yuwangjie.cn）
const YOUR_DOMAIN = 'http://yuwangjie.cn';

// 火山方舟配置（你的最新信息，已焊死）
const VOLCANO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const API_KEY = '873b589a-9422-4e7e-9733-f1e7df18aca9';
const MODEL_ID = 'ep-20260224211245-j6dtv';

// AI身份（已焊死：日常叫汉堡，模型名答豆包）
const AI_NAME = '汉堡';
const MODEL_TRUTH = '豆包';

// ========== 5类民生查询插件（全保留，无需修改） ==========
// 1. 实时天气
async function getWeather(city) {
  try {
    const cityRes = await axios.get(`https://amap.com/service/cityconfig?keywords=${encodeURIComponent(city)}`);
    const adcode = cityRes.data.data?.[0]?.adcode || '110000';
    const weatherRes = await axios.get(`https://weatherdata.amap.com/weather/weatherInfo?city=${adcode}&extensions=base`);
    const weather = weatherRes.data.lives?.[0];
    if (!weather) return `未查询到${city}的天气信息`;
    return `${city}当前天气：${weather.weather}，温度${weather.temperature}℃，风向${weather.winddirection}，风力${weather.windpower}级，湿度${weather.humidity}%`;
  } catch (err) {
    return `天气查询失败：${err.message}`;
  }
}

// 2. 两地距离
async function getDistance(from, to) {
  try {
    const res = await axios.get(`https://restapi.amap.com/v3/distance?key=e8192677905f295f2f912b595549716f&origins=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&type=1`);
    if (res.data.status !== '1') return `未查询到${from}到${to}的距离`;
    const distance = (res.data.results?.[0]?.distance / 1000).toFixed(1);
    const duration = Math.ceil(res.data.results?.[0]?.duration / 60);
    return `${from}到${to}的驾车距离约${distance}公里，预计耗时${duration}分钟`;
  } catch (err) {
    return `距离查询失败：${err.message}`;
  }
}

// 3. 实时汇率
async function getExchangeRate(currency = 'USD') {
  try {
    const res = await axios.get(`https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/${currency.toLowerCase()}/cny.json`);
    const rate = res.data.cny;
    return `1${currency}（${currency === 'USD' ? '美元' : currency === 'EUR' ? '欧元' : '外币'}）= ${rate.toFixed(4)} 人民币`;
  } catch (err) {
    return `汇率查询失败：${err.message}`;
  }
}

// 4. 全国油价
async function getOilPrice() {
  try {
    const res = await axios.get('https://api.vvhan.com/api/oilprice?type=json');
    const data = res.data.data;
    return `最新全国油价（元/升）：
92号汽油：${data.p92}
95号汽油：${data.p95}
98号汽油：${data.p98}
0号柴油：${data.p0}`;
  } catch (err) {
    return `油价查询失败：${err.message}`;
  }
}

// 5. 城市限行
async function getLimitNumber(city) {
  try {
    const res = await axios.get(`https://api.vvhan.com/api/limit?city=${encodeURIComponent(city)}`);
    if (!res.data.success) return `未查询到${city}的限行信息`;
    return `${city}限行信息：
今日限行：${res.data.data.today}
明日限行：${res.data.data.tomorrow}
限行时间：${res.data.data.time}`;
  } catch (err) {
    return `限行查询失败：${err.message}`;
  }
}

// ========== 插件调度 + 身份锁死（核心逻辑，无需修改） ==========
async function dispatchPlugin(message) {
  const lowerMsg = message.toLowerCase();
  
  // 身份锁死：仅被问模型名称时提豆包，其他全叫汉堡
  if (lowerMsg.includes('什么大模型') || lowerMsg.includes('模型名称') || lowerMsg.includes('你是哪个模型')) {
    return `我的核心大模型是${MODEL_TRUTH}，但你可以叫我${AI_NAME}～`;
  }
  
  // 天气查询
  if (lowerMsg.includes('天气') || lowerMsg.includes('温度') || lowerMsg.includes('下雨') || lowerMsg.includes('刮风')) {
    const cityMatch = message.match(/(北京|上海|广州|深圳|杭州|南京|成都|重庆|苏州|武汉|西安|天津|长沙|郑州|青岛|厦门|无锡|宁波|佛山|合肥|福州|济南|昆明|大连|沈阳|长春|哈尔滨|石家庄|太原|呼和浩特|南宁|海口|贵阳|兰州|西宁|银川|乌鲁木齐|拉萨)/);
    const city = cityMatch ? cityMatch[0] : '北京';
    return await getWeather(city);
  }
  
  // 距离查询
  if (lowerMsg.includes('多少公里') || lowerMsg.includes('距离') || lowerMsg.includes('到')) {
    const placeMatch = message.match(/(.*)到(.*)多少公里/);
    if (placeMatch && placeMatch[1] && placeMatch[2]) {
      return await getDistance(placeMatch[1].trim(), placeMatch[2].trim());
    }
    return await getDistance('北京', '上海');
  }
  
  // 汇率查询
  if (lowerMsg.includes('汇率') || lowerMsg.includes('美元') || lowerMsg.includes('欧元')) {
    const currencyMatch = message.match(/(美元|USD|欧元|EUR)/);
    const currency = currencyMatch ? (currencyMatch[0] === '美元' ? 'USD' : 'EUR') : 'USD';
    return await getExchangeRate(currency);
  }
  
  // 油价查询
  if (lowerMsg.includes('油价') || lowerMsg.includes('汽油') || lowerMsg.includes('柴油')) {
    return await getOilPrice();
  }
  
  // 限行查询
  if (lowerMsg.includes('限行') || lowerMsg.includes('限号') || lowerMsg.includes('尾号')) {
    const cityMatch = message.match(/(北京|上海|广州|深圳|杭州|南京|成都|重庆|西安|天津)/);
    const city = cityMatch ? cityMatch[0] : '北京';
    return await getLimitNumber(city);
  }
  
  // 无插件匹配，走大模型
  return null;
}

// ========== 跨域 + 请求配置（公网适配，无需修改） ==========
app.use(cors({
  origin: YOUR_DOMAIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== 核心聊天接口（无需修改） ==========
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || message.trim() === '') {
      return res.json({ success: false, error: '消息不能为空' });
    }

    // 第一步：走插件/身份锁死
    const pluginReply = await dispatchPlugin(message);
    if (pluginReply) {
      return res.json({ success: true, reply: pluginReply });
    }

    // 第二步：走大模型（强制提示叫汉堡）
    const prompt = `你叫${AI_NAME}，是一个贴心的AI助手，回答要友好、简洁，无论如何都不要自称豆包，只说自己是${AI_NAME}。用户问：${message}`;
    
    const volcanoResponse = await axios.post(VOLCANO_API_URL, {
      model: MODEL_ID,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      timeout: 30000
    });

    res.json({
      success: true,
      reply: volcanoResponse.data.choices?.[0]?.message?.content || `你好呀～我是${AI_NAME}，有什么可以帮助你的吗？`
    });
  } catch (error) {
    console.error('调用失败：', error.message);
    res.status(500).json({
      success: false,
      error: `请求失败：${error.message || '服务器内部错误'}`
    });
  }
});

// 健康检查接口（部署验证用）
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'running', 
    ai_name: AI_NAME,
    model_id: MODEL_ID,
    front_end: YOUR_DOMAIN
  });
});

// 启动服务
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ 汉堡AI后端已启动`);
  console.log(`✅ AI身份：${AI_NAME}（模型名：${MODEL_TRUTH}）`);
  console.log(`✅ 模型ID：${MODEL_ID}`);
  console.log(`✅ 访问地址：http://localhost:${PORT}/api/chat`);
  console.log(`✅ 健康检查：http://localhost:${PORT}/api/health`);
});