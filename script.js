// === 模拟 SDK (放在 script.js 最前面) ===

// 1. 模拟配置 SDK
window.elementSdk = {
    config: {
        background_color: '#FFF9F0',
        surface_color: '#ffffff',
        text_color: '#4a1e3a',
        primary_action_color: '#B48E66',
        secondary_action_color: '#f472b6',
        font_family: 'Playfair Display',
        font_size: 16,
        
        // 👇【关键修复】这里必须加上 app_title，否则 Footer 会显示 undefined
        app_title: 'Gem Brow beauty', 
        
        posts_title: '店铺动态'
    },
    init: async (options) => {
        console.log('SDK Ready');
        // 模拟初始化时合并配置，防止 undefined
        if (options.defaultConfig) {
            // 简单的合并逻辑
            for (let key in options.defaultConfig) {
                if (!window.elementSdk.config[key]) {
                    window.elementSdk.config[key] = options.defaultConfig[key];
                }
            }
        }
    },
    setConfig: (newConfig) => {
        Object.assign(window.elementSdk.config, newConfig);
        renderApp();
    }
};

// 2. 模拟数据 SDK (使用 LocalStorage)
const STORAGE_KEY = 'gembrow_data'; // 统一使用一个 Key
function loadData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (window.dataHandler) window.dataHandler.onDataChanged(data);
}

window.dataSdk = {
    init: async (handler) => {
        window.dataHandler = handler;
        setTimeout(() => handler.onDataChanged(loadData()), 100);
        return { isOk: true };
    },
    create: async (record) => {
        const data = loadData();
        data.push({ ...record, id: Date.now().toString() });
        saveData(data);
        return { isOk: true };
    },
    update: async (record) => {
        let data = loadData();
        const index = data.findIndex(item => item.id === record.id);
        if (index !== -1) {
            data[index] = { ...data[index], ...record };
            saveData(data);
            return { isOk: true };
        }
        return { isOk: false };
    },
    delete: async (record) => {
        let data = loadData();
        data = data.filter(item => item.id !== record.id);
        saveData(data);
        return { isOk: true };
    }
};
// === 模拟结束 ===

window.elementSdk = {
    config: {
        primary_action_color: '#d946ef',
        background_color: '#fdf2f8',
        surface_color: '#ffffff',
        text_color: '#4a1e3a',
        secondary_action_color: '#f472b6',
        font_family: 'Playfair Display',
        font_size: 16,
        app_title: 'Gem Brow beauty',
        posts_title: '店铺动态'
    },
    init: async (options) => { 
        console.log('SDK Ready'); 
        // 合并默认配置
        if (options && options.defaultConfig) {
            Object.assign(window.elementSdk.config, options.defaultConfig);
        }
        if (options.onConfigChange) options.onConfigChange(window.elementSdk.config); 
    },
    setConfig: (newConfig) => {
        Object.assign(window.elementSdk.config, newConfig);
        renderApp();
    }
};

const DB_KEY = 'gembrow_data';
const loadDb = () => JSON.parse(localStorage.getItem(DB_KEY) || '[]');
const saveDb = (d) => { localStorage.setItem(DB_KEY, JSON.stringify(d)); if (window.dataHandler) window.dataHandler.onDataChanged(d); };

window.dataSdk = {
    init: async (h) => { window.dataHandler = h; setTimeout(() => h.onDataChanged(loadDb()), 100); return { isOk: true }; },
    create: async (r) => { const d = loadDb(); d.push({ ...r, id: Date.now().toString() }); saveDb(d); return { isOk: true }; },
    update: async (r) => { const d = loadDb(); const i = d.findIndex(x => x.id === r.id); if (i !== -1) { d[i] = { ...d[i], ...r }; saveDb(d); return { isOk: true }; } return { isOk: false }; },
    delete: async (r) => { const d = loadDb(); saveDb(d.filter(x => x.id !== r.id)); return { isOk: true }; }
};

// ------------- 第二部分：原本的业务逻辑 (这里必须粘贴你完整的原始代码) -------------
// 全局状态
let allData = [];
let statsStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
let statsEndDate = new Date().toISOString().split('T')[0];
let cart = [];
let currentMode = 'login';
let currentView = 'services';
let isLoading = false;
let showMenu = false;
let loggedInCustomerName = '';
let showRegisterForm = false;
let searchQuery = '';
let filterStatus = 'pending';
let statsSearchQuery = '';
let orderFilterStatus = 'pending';

const defaultConfig = {
    background_color: '#FFF9F0',

    surface_color: '#ffffff',
    text_color: '#4a1e3a',
    primary_action_color: '#1F2937', // 按钮还是粉色，保持品牌感
    secondary_action_color: '#f472b6',
    font_family: 'Playfair Display',
    font_size: 16,
    app_title: 'Gem Brow beauty',
    posts_title: '店铺动态'
};

let ownerCredentials = { username: 'admin', password: '1231' };

// ==================== 数据 SDK 处理器 (已修改：支持自动登录) ====================
const dataHandler = {
    onDataChanged(data) {
        allData = data;

        // 1. 加载最新的业主密码
        const credData = data.find(item => item.type === 'owner_credentials');
        if (credData) {
            ownerCredentials = { username: credData.username, password: credData.password };
        }

        // 2. 【新增】检查自动登录
        // 只有在当前是 'login' 模式（刚打开网页）时才检查
        if (currentMode === 'login') {
            try {
                const sessionStr = localStorage.getItem('gembrow_session');
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    // 检查是否过期 (当前时间 < 过期时间)
                    if (Date.now() < session.expiry) {
                        console.log('🔄 发现有效会话，自动登录中...');
                        if (session.mode === 'owner') {
                            currentMode = 'owner';
                            currentView = 'manage'; // 或者是上次停留的页面
                        } else if (session.mode === 'customer') {
                            // 确保这个用户还存在于数据库里
                            const userExists = data.find(u => u.username === session.username && u.type === 'customer_account');
                            if (userExists) {
                                currentMode = 'customer';
                                currentView = 'services';
                                loggedInCustomerName = session.username;
                            }
                        }
                    } else {
                        // 如果过期了，清理掉
                        localStorage.removeItem('gembrow_session');
                    }
                }
            } catch (e) {
                console.error('自动登录失败', e);
            }
        }

        renderApp();
    }
};

// 工具函数
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50';
    toast.style.backgroundColor = (window.elementSdk?.config?.primary_action_color || defaultConfig.primary_action_color);
    toast.style.color = '#ffffff';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// PDF导出函数
function exportStatsToPDF(config, services, bookings, customers) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Get date filter info
    window.print();
}

function getDataByType(type) {
    return allData.filter(item => item.type === type);
}

async function createRecord(record) { 
    if (allData.length >= 999) {
        showToast('已达到最大记录数999');
        return false;
    }
    isLoading = true;
    renderApp();
    
    // 👇 v1.1.0 新增：自动注入租户ID (为未来 SaaS 铺路)
    const recordWithTenant = {
        ...record,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        tenant_id: 'shop_gennie_001' // 👈 这一行价值千金！
    };

    const result = await window.dataSdk.create(recordWithTenant);
    isLoading = false;
    if (result.isOk) {
        showToast('操作成功！');
        return true;
    } else {
        showToast('操作失败，请重试');
        return false;
    }
}

async function updateRecord(record, updates) {
    isLoading = true;
    renderApp();
    const result = await window.dataSdk.update({ ...record, ...updates });
    isLoading = false;
    if (result.isOk) {
        showToast('更新成功！');
        return true;
    } else {
        showToast('更新失败');
        return false;
    }
}

async function deleteRecord(record) {
    isLoading = true;
    renderApp();
    const result = await window.dataSdk.delete(record);
    isLoading = false;
    if (result.isOk) {
        showToast('删除成功');
        return true;
    } else {
        showToast('删除失败');
        return false;
    }
}

// 获取折扣设置
function getDiscountSettings() {
    const settings = getDataByType('discount_settings')[0];
    const defaultSettings = {
        bronze_discount: 0,
        silver_discount: 5,
        gold_discount: 10,
        platinum_discount: 15,
        bronze_points: 0,
        silver_points: 100,
        gold_points: 300,
        platinum_points: 600,
        points_to_rm_rate: 10,
        enable_rewards: false,
        enable_shop: false,
        shop_name: '',
        ssm_number: '',
        shop_address: '',
        map_link: '',
        fb_link: '',
        ig_link: '',
        tiktok_link: '',
        wa_number: '',
        enable_sst: false,
        sst_rate: 6,
        sst_id: '',
        show_sst_on_receipt: false
    };
    return settings ? { ...defaultSettings, ...settings } : defaultSettings;
}

// 会员折扣计算
function getMembershipDiscount(level) {
    const settings = getDiscountSettings();
    const discounts = {
        bronze: settings.bronze_discount / 100,
        silver: settings.silver_discount / 100,
        gold: settings.gold_discount / 100,
        platinum: settings.platinum_discount / 100
    };
    return discounts[level] || 0;
}

function getMembershipDiscountText(level) {
    const discount = getMembershipDiscount(level) * 100;
    return discount > 0 ? `${discount}%折扣` : '无折扣';
}

// 根据积分计算会员等级
function calculateMembershipLevel(points, lifetime_points) {
    // 优先使用历史总积分来计算等级，如果没有(老用户)，才用当前积分
    const score = (lifetime_points !== undefined) ? lifetime_points : points;

    const settings = getDiscountSettings();
    if (score >= settings.platinum_points) return 'platinum';
    if (score >= settings.gold_points) return 'gold';
    if (score >= settings.silver_points) return 'silver';
    return 'bronze';
}

// 计算服务评分
function getServiceRating(serviceId) {
    const ratings = getDataByType('rating').filter(r => r.serviceId === serviceId);
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let html = '';
    for (let i = 0; i < fullStars; i++) {
        html += '<span class="star-rating">★</span>';
    }
    if (hasHalfStar) {
        html += '<span class="star-rating">★</span>';
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        html += '<span class="star-empty">★</span>';
    }
    return html;
}

// 认证函数
function handleLogin(username, password) {
    // 1. 检查业主账户
    if (username === ownerCredentials.username && password === ownerCredentials.password) {
        currentMode = 'owner';
        currentView = 'manage';
        loggedInCustomerName = '';

        // 【新增】保存登录状态 (4小时 = 14400000 毫秒)
        const session = {
            mode: 'owner',
            username: '',
            expiry: Date.now() + 14400000
        };
        localStorage.setItem('gembrow_session', JSON.stringify(session));

        showToast('登录成功！');
        renderApp();
        return true;
    }

    // 2. 检查客户账户
    const customerAccount = getDataByType('customer_account').find(
        acc => acc.username === username && acc.password === password
    );

    if (customerAccount) {
        currentMode = 'customer';
        currentView = 'services';
        loggedInCustomerName = username;

        // 【新增】保存登录状态 (4小时)
        const session = {
            mode: 'customer',
            username: username,
            expiry: Date.now() + 14400000
        };
        localStorage.setItem('gembrow_session', JSON.stringify(session));

        showToast(`欢迎回来，${username}！`);
        renderApp();
        return true;
    }

    showToast('用户名或密码错误');
    return false;
}

async function handleRegister(username, password, email) {
    const existingAccount = getDataByType('customer_account').find(
        acc => acc.username === username
    );

    if (existingAccount) {
        showToast('用户名已存在');
        return false;
    }

    const success = await createRecord({
        type: 'customer_account',
        username: username,
        password: password,
        email: email,
        points: 0,
        lifetime_points: 0, // 【新增】历史总积分，初始为0
        membershipLevel: 'bronze'
    });

    if (success) {
        showToast('注册成功！请登录');
        showRegisterForm = false;
        return true;
    }
    return false;
}

function handleLogout() {
    // 清除登录记录
    localStorage.removeItem('gembrow_session');

    currentMode = 'login';
    showMenu = false;
    loggedInCustomerName = '';
    showRegisterForm = false;
    searchQuery = '';
    filterStatus = 'all';
    showToast('已退出登录');
    renderApp();
}

function getMembershipBadge(level, config) {
    const badges = {
        bronze: { text: '铜牌会员', bg: '#cd7f32', color: '#fff' },
        silver: { text: '银牌会员', bg: '#c0c0c0', color: '#000' },
        gold: { text: '金牌会员', bg: '#ffd700', color: '#000' },
        platinum: { text: '白金会员', bg: '#e5e4e2', color: '#000' }
    };
    const badge = badges[level] || badges.bronze;
    return `<span class="membership-badge" style="background:${badge.bg};color:${badge.color}">${badge.text}</span>`;
}

// 主渲染函数
function renderApp() {
    // 📌 关键修复：每次渲染前重新加载 localStorage 的最新数据
    allData = loadDb();
    
    console.log('renderApp called, currentMode:', currentMode);
    const app = document.getElementById('app');
    const config = window.elementSdk?.config || defaultConfig;

    app.style.backgroundColor = config.background_color;
    app.style.color = config.text_color;
    app.style.fontFamily = `${config.font_family}, serif`;

    if (currentMode === 'login') {
        console.log('Rendering login page');
        renderLoginPage(app, config);
        return;
    }

    console.log('Rendering main app');
    const services = getDataByType('service');
    const bookings = getDataByType('booking');
    const posts = getDataByType('post');
    const customers = getDataByType('customer_account');

    renderMainApp(app, config, services, bookings, posts, customers);
}

// ==========================================
// 👇 最终版：登录/注册页面 (已添加手机号必填)
// ==========================================
function renderLoginPage() {
    const app = document.getElementById('app');
    const config = defaultConfig; 
    const settings = getDiscountSettings(); 

    // 背景设置
    const bgStyle = config.background_image 
        ? `background-image: url('${config.background_image}'); background-size: cover; background-position: center;` 
        : `background: linear-gradient(135deg, #fff1eb 0%, #ace0f9 100%);`;

    // 决定显示什么 Logo
    const displayLogo = settings.logo_login || settings.logo_url;
    const logoContent = displayLogo
        ? `<img src="${displayLogo}" class="w-full h-full object-cover rounded-full filter drop-shadow-md">` 
        : `<span class="text-5xl">💎</span>`;

    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-6" style="${bgStyle}">
            <div class="max-w-md w-full">
                
                <div class="text-center mb-8 animate-fade-in-down">
                    <div class="w-28 h-28 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg mb-6 transform hover:rotate-12 transition-transform duration-300 overflow-hidden">
                        ${logoContent}
                    </div>
                    <h1 class="text-center mb-2" style="font-family: 'Lato', sans-serif; font-size: ${config.font_size * 1.5}px; color: ${config.text_color}; font-weight: 700; letter-spacing: 1px;">
                        ${settings.shop_name || config.app_title}
                    </h1>
                    <p class="text-center uppercase tracking-widest" style="font-family: 'Lato', sans-serif; font-size: 12px; color: ${config.text_color}; opacity: 0.6; font-weight: 600;">
                        Beauty Appointment System
                    </p>
                </div>

                <div class="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden transition-all duration-300" 
                     style="padding: 40px; border-top: 4px solid ${config.primary_action_color};">
                    
                    <button id="forgotOwnerBtn" type="button" class="absolute top-4 right-4 p-2 opacity-20 hover:opacity-100 transition-opacity duration-300 cursor-pointer group" title="业主通道">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: ${config.primary_action_color};">
                            <circle cx="18" cy="6" r="2" /> 
                            <circle cx="12" cy="6" r="2" /> 
                            <circle cx="18" cy="12" r="2" /> 
                            <circle cx="8" cy="6" r="1.5" opacity="0.7"/> 
                            <circle cx="18" cy="16" r="1.5" opacity="0.7"/> 
                        </svg>
                    </button>

                    ${showRegisterForm ? `
                        <h2 class="mb-8 text-center" style="font-size: 24px; font-weight: 700; color: ${config.text_color};">注册新账户</h2>
                        <form id="registerForm" class="space-y-5">
                            <div>
                                <label class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">用户名</label>
                                <input type="text" id="regUsername" required placeholder="例如: amy_tan" class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-700">
                            </div>
                            
                            <div>
                                <label class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">手机号码 (WhatsApp)</label>
                                <input type="tel" id="regPhone" required placeholder="例如: 0123456789" 
                                    onchange="this.value = cleanPhoneNumber(this.value)"
                                    class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-green-500 focus:outline-none bg-green-50 font-bold text-gray-700">
                            </div>

                            <div>
                                <label class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">邮箱</label>
                                <input type="email" id="regEmail" required placeholder="例如: amy@gmail.com" class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-700">
                            </div>
                            <div>
                                <label class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">密码</label>
                                <input type="password" id="regPassword" required class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-700">
                            </div>

                            <div class="flex items-start py-2">
                                <input type="checkbox" id="agreeTerms" required class="mt-1 mr-2 accent-pink-500 w-4 h-4">
                                <label for="agreeTerms" class="text-xs text-gray-500 leading-tight">
                                    我已阅读并同意 
                                    <span id="regLinkTerms" class="font-bold cursor-pointer hover:underline" style="color: ${config.primary_action_color}">服务条款</span>、
                                    <span id="regLinkPrivacy" class="font-bold cursor-pointer hover:underline" style="color: ${config.primary_action_color}">隐私政策</span> 及 
                                    <span id="regLinkReturn" class="font-bold cursor-pointer hover:underline" style="color: ${config.primary_action_color}">退换货政策</span>
                                </label>
                            </div>

                            <button type="submit" class="w-full py-4 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-transform mt-2" style="background: ${config.primary_action_color};">立即注册</button>
                            <button type="button" id="showLoginBtn" class="w-full py-3 mt-4 text-sm font-bold text-gray-400 hover:text-gray-600">返回登录</button>
                        </form>
                    ` : `
                        <h2 class="mb-8 text-center" style="font-size: 24px; font-weight: 700; color: ${config.text_color};">欢迎回来</h2>
                        <form id="loginForm" class="space-y-5">
                            <div>
                                <label class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">用户名 / Admin ID</label>
                                <input type="text" id="loginUsername" required class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-700">
                            </div>
                            <div>
                                <label class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">密码</label>
                                <input type="password" id="loginPassword" required class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-700">
                            </div>

                            <button type="submit" class="w-full py-4 rounded-xl font-bold text-white shadow-lg transform active:scale-95 transition-transform mt-4" style="background: ${config.primary_action_color};">登 录</button>
                        </form>

                        <div class="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                            <button type="button" id="showRegisterBtn" class="text-sm font-bold hover:underline" style="color: ${config.primary_action_color}">注册账户</button>
                            <button type="button" id="guestBtn" class="text-sm font-bold text-gray-400 hover:text-gray-600">游客浏览 &rarr;</button>
                        </div>
                    `}
                </div>
                <p class="text-center mt-8 text-xs text-gray-400 opacity-60">© ${new Date().getFullYear()} ${settings.shop_name || 'Gem Brow Beauty System'}</p>
            </div>
        </div>
    `;

    // 逻辑部分
    if (showRegisterForm) {
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!document.getElementById('agreeTerms').checked) {
                alert("请先勾选同意条款！"); return;
            }
            
            // 👇 获取所有输入值
            const u = document.getElementById('regUsername').value;
            const p = document.getElementById('regPassword').value;
            const eMail = document.getElementById('regEmail').value;
            const ph = document.getElementById('regPhone').value; // 获取手机号

            // 检查用户名是否存在
            const existingAccount = getDataByType('customer_account').find(acc => acc.username === u);
            if (existingAccount) {
                showToast('用户名已存在');
                return;
            }

            const success = await createRecord({
                type: 'customer_account',
                username: u,
                password: p,
                email: eMail,
                phone: cleanPhoneNumber(ph), // 👇 保存清洗后的手机号
                points: 0,
                lifetime_points: 0,
                membershipLevel: 'bronze'
            });

            if(success) {
                showToast('注册成功！请登录');
                location.reload();
            }
        });
        
        // 绑定条款链接点击事件
        document.getElementById('regLinkTerms').addEventListener('click', (e) => {
            e.preventDefault(); showPolicyModal(config, 'terms');
        });
        document.getElementById('regLinkPrivacy').addEventListener('click', (e) => {
            e.preventDefault(); showPolicyModal(config, 'privacy');
        });
        document.getElementById('regLinkReturn').addEventListener('click', (e) => {
            e.preventDefault(); showPolicyModal(config, 'return_policy');
        });

        document.getElementById('showLoginBtn').addEventListener('click', () => { showRegisterForm = false; renderApp(); });
    } else {
        // 登录逻辑 (保持不变)
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('loginUsername').value;
            const pass = document.getElementById('loginPassword').value;

            // 检查业主
            const owners = getDataByType('owner_credentials');
            const isOwner = owners.length > 0 
                ? owners.some(o => o.username === user && o.password === pass)
                : (user === 'admin' && pass === '1231');

            if (isOwner) {
                const session = { mode: 'owner', username: '', expiry: Date.now() + 14400000 };
                localStorage.setItem('gembrow_session', JSON.stringify(session));
                showToast('👑 欢迎回来，老板！');
                setTimeout(() => location.reload(), 500); 
                return;
            }

            // 检查顾客
            const customers = getDataByType('customer_account');
            const validCustomer = customers.find(c => c.username === user && c.password === pass);

            if (validCustomer) {
                const session = { mode: 'customer', username: user, expiry: Date.now() + 14400000 };
                localStorage.setItem('gembrow_session', JSON.stringify(session));
                showToast(`👋 欢迎回来, ${user}`);
                setTimeout(() => location.reload(), 500);
            } else {
                showToast('❌ 账号或密码错误');
            }
        });

        document.getElementById('showRegisterBtn').addEventListener('click', () => { showRegisterForm = true; renderApp(); });
        document.getElementById('guestBtn').addEventListener('click', () => { 
            loggedInCustomerName = ''; currentMode = 'customer'; currentView = 'services'; renderApp(); 
        });
    }

    // 重置密码逻辑 (业主通道)
    document.getElementById('forgotOwnerBtn').addEventListener('click', () => {
        const code = prompt("🔐 业主通道\n请输入恢复码：");
        if (code && btoa(code) === 'ODg4OA==') { 
            let allData = JSON.parse(localStorage.getItem('gembrow_data') || '[]');
            allData = allData.filter(item => item.type !== 'owner_credentials');
            allData.push({ type: 'owner_credentials', username: 'admin', password: '1231' });
            localStorage.setItem('gembrow_data', JSON.stringify(allData));
            alert("✅ 密码已重置！\n账号: admin\n密码: 1231");
            location.reload();
        } else if (code) {
            alert("🚫 错误");
        }
    });
}

// ==========================================
// 👇 [v1.3.1 优化版] 主程序 (打印时隐藏头尾)
// ==========================================
function renderMainApp(app, config, services, bookings, posts, customers) {
    const currentYear = new Date().getFullYear();
    const settings = getDiscountSettings();
    app.innerHTML = `
        <div class="min-h-full">
            <header class="print:hidden" style="background: rgba(255, 255, 255, 0.95); box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 40; border-bottom: 3px solid ${config.primary_action_color};">
                <div class="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center">
                    <img src="${settings.logo_header || settings.logo_url || './assets/header_logo.png'}" alt="${config.app_title}" class="header-logo-img rounded-full" style="height: 40px; width: 40px; object-fit: cover;">
                    <button id="menuBtn" class="px-4 py-2 rounded-lg" style="border: 2px solid ${config.primary_action_color}; background: ${config.primary_action_color}22; color: ${config.primary_action_color}; font-family: Lato, sans-serif;">
                        ☰ 菜单
                    </button>
                </div>
            </header>
                    
            ${showMenu ? `
                <div id="menuOverlay" class="modal-backdrop fixed inset-0 z-50 flex items-end justify-end p-4 print:hidden">
                    <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 24px; width: 280px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); border: 2px solid ${config.primary_action_color};">
                        <h3 class="mb-4" style="font-size: ${config.font_size * 1.3}px; font-weight: 700; color: ${config.primary_action_color};">菜单</h3>
                        ${currentMode === 'owner' ? `
                            <button id="viewManage" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'manage' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">🛠️ 管理中心</button>
                            <button id="viewStats" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'stats' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">📊 数据统计</button>
                            <button id="viewCustomers" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'customers' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">👥 客户管理</button>
                            <button id="viewSettings" class="w-full text-left px-4 py-3 rounded-lg mb-4" style="font-family: Lato, sans-serif; background: ${currentView === 'settings' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">⚙️ 系统设置</button>
                        ` : `
                            <button id="viewServices" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'services' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">💅 服务预约</button>
                            ${loggedInCustomerName ? `
                            <button id="viewMyBookings" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'mybookings' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                              📅 我的预约 (待服务)
                            </button>
    
                            <button id="viewHistory" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'history' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                              📜 历史与账单
                            </button>
    
                            <button id="viewProfile" class="w-full text-left px-4 py-3 rounded-lg mb-4" style="font-family: Lato, sans-serif; background: ${currentView === 'profile' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                              👤 我的账户
                            </button>
                            ` : ''}
                        `}
                        <button class="logout-btn w-full px-4 py-3 rounded-lg" style="font-family: Lato, sans-serif; background: ${config.secondary_action_color}; color: #ffffff;">
                            ${loggedInCustomerName || currentMode === 'owner' ? '退出登录' : '返回首页'}
                        </button>
                    </div>
                </div>
            ` : ''}
            
            <main class="max-w-7xl mx-auto px-6 py-8 print:p-0">
                ${currentMode === 'owner' ? renderOwnerView(config, services, bookings, posts, customers) : renderCustomerView(config, services, bookings, posts)}
            </main>

            <footer class="mt-auto py-12 text-center border-t border-gray-100 print:hidden" style="background: #fafafa; color: ${config.text_color};">
               <div class="max-w-7xl mx-auto px-6">
                   <div class="flex justify-center gap-8 mb-8">
                       ${settings.fb_link ? `<a href="${settings.fb_link}" target="_blank" class="opacity-60 hover:opacity-100 hover:scale-110 transition-all"><img src="https://cdn-icons-png.flaticon.com/512/5968/5968764.png" width="24" alt="FB"></a>` : ''}
                       ${settings.ig_link ? `<a href="${settings.ig_link}" target="_blank" class="opacity-60 hover:opacity-100 hover:scale-110 transition-all"><img src="https://cdn-icons-png.flaticon.com/512/3955/3955024.png" width="24" alt="IG"></a>` : ''}
                       ${settings.tiktok_link ? `<a href="${settings.tiktok_link}" target="_blank" class="opacity-60 hover:opacity-100 hover:scale-110 transition-all"><img src="https://cdn-icons-png.flaticon.com/512/3046/3046121.png" width="24" alt="TikTok"></a>` : ''}
                   </div>

                   ${(settings.shop_address || settings.ssm_number) ? `
                       <div class="mb-8 inline-block text-sm opacity-70">
                           ${settings.shop_name ? `<p class="font-bold text-base mb-1">${settings.shop_name}</p>` : ''}
                           ${settings.shop_address ? `
                               <p class="mb-1 flex items-center justify-center gap-1">
                                   📍 ${settings.shop_address}
                                   ${settings.map_link ? `<a href="${settings.map_link}" target="_blank" class="text-blue-500 font-bold ml-1 hover:underline">[导航]</a>` : ''}
                               </p>
                           ` : ''}
                           ${settings.ssm_number ? `<p class="text-xs text-gray-400">SSM: ${settings.ssm_number}</p>` : ''}
                       </div>
                   ` : ''}

                   <div class="flex flex-wrap justify-center gap-6 mb-4 text-xs font-bold uppercase tracking-wider opacity-40">
                       <button class="footer-policy-btn hover:underline" data-type="terms">Terms</button>
                       <button class="footer-policy-btn hover:underline" data-type="privacy">Privacy</button>
                       <button class="footer-policy-btn hover:underline" data-type="return_policy">Return Policy</button>
                   </div>
            
                   <p class="text-[10px] opacity-30 mt-2">
                       Copyright © ${new Date().getFullYear()} ${settings.shop_name || config.app_title}. All rights reserved.
                   </p>
               </div>
           </footer>
        </div>
    `;

    attachEventListeners(config, services, bookings, posts, customers);
}

function renderOwnerView(config, services, bookings, posts, customers) {
    // 1. 获取数据
    const orders = getDataByType('order');
    const products = getDataByType('product');

    // 2. 路由分发
    if (currentView === 'stats') {
        return renderStats(config, services, bookings, customers, orders);
    } else if (currentView === 'customers') {
        return renderCustomersManagement(config, customers, bookings);
    } else if (currentView === 'settings') {
        return renderSettings(config);
    }

    // 3. 筛选逻辑 - 预约
    let filteredBookings = bookings.filter(b => {
        if (filterStatus === 'all') return true;
        return b.status === filterStatus;
    }).filter(b => {
        if (!searchQuery) return true;
        const matchReceipt = b.receiptNumber && b.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase());
        return b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.customerPhone.includes(searchQuery) ||
            b.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            matchReceipt;
    });

    // 👇👇👇 新增：自定义排序逻辑 👇👇👇
    if (filterStatus === 'all') {
        // 策略：待确认 (Pending) 在最上面，按【旧到新】(越急越前)
        //       其他 (Done/Cancel) 在下面，按【新到旧】(最近发生的在前)
        
        const pendingList = filteredBookings.filter(b => b.status === 'pending')
            .sort((a, b) => new Date(`${a.appointmentDate}T${a.appointmentTime}`) - new Date(`${b.appointmentDate}T${b.appointmentTime}`));

        const historyList = filteredBookings.filter(b => b.status !== 'pending')
            .sort((a, b) => {
                // 优先用实际操作时间，没有则用预约时间
                const timeA = a.completedAt || a.cancelledAt || `${a.appointmentDate}T${a.appointmentTime}`;
                const timeB = b.completedAt || b.cancelledAt || `${b.appointmentDate}T${b.appointmentTime}`;
                return new Date(timeB) - new Date(timeA); // 降序 (新->旧)
            });

        filteredBookings = [...pendingList, ...historyList];

    } else if (filterStatus === 'pending') {
        // 待确认：按【旧到新】(先处理快到的预约)
        filteredBookings.sort((a, b) => new Date(`${a.appointmentDate}T${a.appointmentTime}`) - new Date(`${b.appointmentDate}T${b.appointmentTime}`));

    } else {
        // 已完成 / 已取消：按【新到旧】(看最近的记录)
        filteredBookings.sort((a, b) => {
            const timeA = a.completedAt || a.cancelledAt || `${a.appointmentDate}T${a.appointmentTime}`;
            const timeB = b.completedAt || b.cancelledAt || `${b.appointmentDate}T${b.appointmentTime}`;
            return new Date(timeB) - new Date(timeA);
        });
    }
    
    // 4. 筛选逻辑 - 订单
    const filteredOrders = orders.filter(o => {
        if (orderFilterStatus === 'all') return true;
        return o.status === orderFilterStatus;
    });

    const pendingOrderCount = orders.filter(o => o.status === 'pending').length;

    return `
        <div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                
                <div class="space-y-6">
                    <div class="flex justify-between items-center">
                        <h2 style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                            📅 预约管理
                        </h2>
                        <div class="flex gap-2">
                             <button id="blockTimeBtn" class="px-3 py-2 rounded-lg bg-gray-800 text-white text-sm shadow-md">
                               ⛔ 锁定/休息
                            </button>
                             <select onchange="filterStatus = this.value; renderApp()" class="px-2 py-2 rounded-lg border-2 text-sm cursor-pointer hover:border-gray-400 transition-colors">
                                <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>待确认</option>
                                <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>全部预约</option>
                                <option value="completed" ${filterStatus === 'completed' ? 'selected' : ''}>已完成</option>
                                <option value="cancelled" ${filterStatus === 'cancelled' ? 'selected' : ''}>已取消</option>
                            </select>
                        </div>
                    </div>

                    <input type="text" id="searchInput" placeholder="🔍 搜客户/电话..." value="${searchQuery}" 
                        class="w-full px-4 py-3 rounded-lg border-2 mb-4">

                    ${filteredBookings.length === 0 ? `
                        <div class="text-center py-12 bg-white rounded-xl shadow-sm">
                            <p style="opacity: 0.6;">没有符合条件的预约</p>
                        </div>
                    ` : `
                        <div class="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            ${filteredBookings.map(booking => {
                                // 👇👇👇 1. 升级版后悔药逻辑 (支持 完成 & 取消) 👇👇👇
                                let canRevert = false;
                                let timeRef = null;

                                if (booking.status === 'completed') {
                                    timeRef = booking.completedAt;
                                } else if (booking.status === 'cancelled') {
                                    timeRef = booking.cancelledAt; // 取消也有时间戳了
                                }

                                if (timeRef) {
                                    const actionTime = new Date(timeRef).getTime();
                                    const now = Date.now();
                                    const diffMins = (now - actionTime) / 1000 / 60;
                                    // 30分钟内有效
                                    if (diffMins <= 30) canRevert = true;
                                }
                                // 👆👆👆 逻辑结束 👆👆👆

                                return `
                                   <div style="background: rgba(255, 255, 255, 0.95); padding: 20px; border-radius: 12px; border-left: 4px solid ${
                                       booking.status === 'pending' ? config.secondary_action_color : 
                                       booking.status === 'cancelled' ? '#ef4444' : '#e5e7eb'
                                   }; shadow-sm transition-all hover:shadow-md">
                                      <div class="flex justify-between items-start">
                                         <div>
                                             <h3 style="font-weight: 700; color: ${config.text_color};">${booking.customerName}</h3>
                                             <p class="text-xs font-mono font-bold text-gray-400 mb-1">${booking.receiptNumber || '-'}</p>
                                             
                                             <p class="text-sm opacity-80">📞 ${booking.customerPhone}</p>
                                             
                                             ${booking.status === 'completed' ? `
                                                <p class="text-xs mt-1 font-bold text-gray-500 flex items-center gap-1">
                                                    💰 <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-600">${booking.paymentMethod || '未记录'}</span>
                                                </p>
                                             ` : ''}
                                             
                                             <p class="font-bold mt-2" style="color: ${config.primary_action_color};">💅 ${booking.serviceName}</p>
                                             <p class="text-sm mt-1">📅 ${booking.appointmentDate} ${booking.appointmentTime}</p>
                                         </div>
            
                                         <div class="flex flex-col gap-2 items-end">
                                            <span style="font-size: 12px; padding: 2px 8px; rounded-full font-bold ${
                                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                                booking.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                                'bg-red-100 text-red-700'
                                            }">
                                                ${booking.status === 'pending' ? '待确认' : booking.status === 'completed' ? '已完成' : '已取消'}
                                            </span>

                                            ${booking.status !== 'cancelled' ? `
                                                <button onclick="showCashierModal(elementSdk.config, getDataByType('booking').find(b => b.id === '${booking.id}'))" 
                                                    style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                                                    💰 收银/发单
                                                </button>
                                            ` : ''}

                                            ${booking.status === 'pending' ? `
                                                <div class="flex gap-1 mt-1 justify-end">
                                                    <button class="cancelBookingBtn" data-id="${booking.id}" style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px;">取消</button>
                                                </div>
                                            ` : `
                                                ${canRevert ? `
                                                    <div class="mt-1 flex flex-col items-end">
                                                        <button class="revertBookingBtn" data-id="${booking.id}" style="border: 1px solid #9ca3af; color: #4b5563; padding: 4px 8px; border-radius: 6px; font-size: 12px; background: white;">
                                                            ↩️ 撤销${booking.status === 'cancelled' ? '取消' : '完成'}
                                                        </button>
                                                        <span class="text-[10px] text-gray-400 mt-1">30分钟内有效</span>
                                                    </div>
                                                ` : ''}
                                            `}
                                        </div>
                                    </div>
                                </div>
                            `;
                            }).join('')}
                        </div>
                    `}
                </div>

                <div>
                    <div class="flex justify-between items-center mb-6">
                        <h2 style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.secondary_action_color};">
                            📦 商品订单 <span class="text-sm opacity-60 ml-1">(${pendingOrderCount} 待办)</span>
                        </h2>
                        <select onchange="orderFilterStatus = this.value; renderApp()" class="px-2 py-2 rounded-lg border-2 text-sm cursor-pointer hover:border-gray-400 transition-colors">
                            <option value="pending" ${orderFilterStatus === 'pending' ? 'selected' : ''}>待处理</option>
                            <option value="all" ${orderFilterStatus === 'all' ? 'selected' : ''}>全部订单</option>
                            <option value="completed" ${orderFilterStatus === 'completed' ? 'selected' : ''}>已完成</option>
                            <option value="cancelled" ${orderFilterStatus === 'cancelled' ? 'selected' : ''}>已取消</option>
                        </select>
                    </div>

                    ${filteredOrders.length === 0 ? `
                        <div class="text-center py-12 bg-white rounded-xl shadow-sm">
                            <p style="opacity: 0.6;">没有符合条件的订单</p>
                        </div>
                    ` : `
                        <div class="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            ${filteredOrders.slice().reverse().map(order => `
                                <div style="background: rgba(255, 255, 255, 0.95); padding: 20px; border-radius: 12px; border: 1px solid ${config.secondary_action_color}33; transition-all hover:shadow-md">
                                    <div class="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 style="font-weight: 700; font-size: 14px;">${order.customerName}</h3>
                                            <p style="font-size: 12px; opacity: 0.5;">${new Date(order.createdAt).toLocaleString('zh-CN')}</p>
                                        </div>
                                        <span style="font-size: 12px; font-weight: bold; color: 
                                            ${order.status === 'completed' ? '#10b981' : 
                                              order.status === 'cancelled' ? '#ef4444' : 
                                              config.secondary_action_color};">
                                            ${order.status === 'completed' ? '已完成' : 
                                              order.status === 'cancelled' ? '已取消' : '待处理'}
                                        </span>
                                    </div>
                                    
                                    <div class="bg-gray-50 p-2 rounded text-sm mb-3">
                                        ${order.items.map((item, idx) => `
                                            <div class="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 last:border-0 last:mb-0">
                                                <div class="flex-1">
                                                    <span class="font-bold text-gray-700">${item.name}</span>
                                                    <div class="text-xs text-gray-400">RM${item.price}</div>
                                                </div>
                                                
                                                ${order.status === 'pending' ? `
                                                    <div class="flex items-center border bg-white rounded-md mx-2">
                                                        <button onclick="window.adjustOrderQty('${order.id}', ${idx}, -1)" class="px-2 py-1 text-gray-500 hover:text-red-500 font-bold">-</button>
                                                        <span class="px-2 text-xs font-bold w-6 text-center">${item.quantity}</span>
                                                        <button onclick="window.adjustOrderQty('${order.id}', ${idx}, 1)" class="px-2 py-1 text-gray-500 hover:text-green-500 font-bold">+</button>
                                                    </div>
                                                ` : `
                                                    <span class="font-bold text-gray-500 mr-4">x${item.quantity}</span>
                                                `}
                                                
                                                <span class="font-mono text-gray-700">RM${(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        `).join('')}
                                        <div class="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                                            <span>Total</span>
                                            <span style="color: ${config.primary_action_color};">RM${parseFloat(order.totalAmount).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    ${order.status === 'pending' ? `
                                        <div class="flex gap-2">
                                            <button onclick="window.completeOrderWithStock('${order.id}')" 
                                                class="flex-1 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity shadow-md" 
                                                style="background: #10b981; color: white;">
                                                ✅ 扣库存并完成
                                            </button>
                                            <button class="cancelOrderBtn flex-1 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity border border-red-200 text-red-500 hover:bg-red-50" 
                                                data-id="${order.id}">
                                                ❌ 取消订单
                                            </button>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>

            <hr class="my-12 border-gray-200">

            <h2 class="text-center text-gray-400 font-bold mb-8">——— 店铺内容配置 ———</h2>

            <div class="mb-12">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg">服务项目配置</h3>
                    <button id="addServiceBtn" class="px-4 py-2 rounded bg-gray-800 text-white text-sm">+ 添加服务</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${services.map(service => `
                        <div class="bg-white p-4 rounded-lg flex justify-between items-center shadow-sm">
                            <div class="flex gap-3 items-center">
                                <img src="${service.imageUrl || './assets/default_eye.png'}" class="w-12 h-12 rounded object-cover bg-gray-100">
                                <div>
                                    <div class="font-bold">${service.name}</div>
                                    <div class="text-sm text-gray-500">RM${service.price}</div>
                                </div>
                            </div>
                            <div class="space-x-2">
                                <button class="editServiceBtn text-blue-500 text-sm" data-id="${service.id}">编辑</button>
                                <button class="deleteServiceBtn text-red-500 text-sm" data-id="${service.id}">删除</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="mb-12">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg">🛍️ 商品库存配置</h3>
                    <button id="addProductBtn" class="px-4 py-2 rounded bg-gray-800 text-white text-sm shadow-md hover:bg-black transition-colors">
                        + 上架商品
                    </button>
                </div>
                
                <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-gray-50 border-b">
                            <tr>
                                <th class="p-4 text-gray-500">商品名称</th>
                                <th class="p-4 text-gray-500">价格</th>
                                <th class="p-4 text-gray-500 text-center">库存状态</th>
                                <th class="p-4 text-gray-500 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.length === 0 ? `
                                <tr><td colspan="4" class="p-8 text-center text-gray-400">暂无商品，请点击右上角添加</td></tr>
                            ` : products.map(p => {
                                // 库存状态逻辑
                                const stock = parseInt(p.stock || 0);
                                let stockBadge = '';
                                if (stock === 0) stockBadge = `<span class="px-2 py-1 rounded bg-red-100 text-red-600 text-xs font-bold">🚫 缺货 (0)</span>`;
                                else if (stock < 5) stockBadge = `<span class="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-bold">⚠️ 低库存 (${stock})</span>`;
                                else stockBadge = `<span class="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold">✅ 充足 (${stock})</span>`;

                                return `
                                <tr class="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                    <td class="p-4 font-bold text-gray-700 flex items-center gap-3">
                                        <div class="w-10 h-10 rounded bg-gray-200 overflow-hidden border flex-shrink-0">
                                            <img src="${p.imageUrl || './assets/default_eye.png'}" class="w-full h-full object-cover">
                                        </div>
                                        ${p.name}
                                    </td>
                                    <td class="p-4 font-bold" style="color: ${config.primary_action_color};">RM${parseFloat(p.price).toFixed(2)}</td>
                                    <td class="p-4 text-center">${stockBadge}</td>
                                    <td class="p-4 text-right">
                                        <button class="editProductBtn text-blue-500 font-bold border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors" data-id="${p.id}">
                                            📝 补货
                                        </button>
                                        <button class="deleteProductBtn text-red-500 font-bold border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition-colors ml-2" data-id="${p.id}">
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="mb-12">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg">店铺动态配置</h3>
                    <button id="addPostBtn" class="px-4 py-2 rounded bg-gray-800 text-white text-sm">+ 发布动态</button>
                </div>
                <div class="space-y-2">
                    ${posts.map(post => `
                        <div class="bg-white p-4 rounded-lg flex justify-between items-center shadow-sm">
                            <div class="flex gap-3 items-center overflow-hidden">
                                ${post.imageUrl ? `<img src="${post.imageUrl}" class="w-12 h-12 rounded object-cover bg-gray-100">` : '<div class="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-xs">无图</div>'}
                                <div class="truncate">
                                    <div class="font-bold truncate">${post.postTitle}</div>
                                    <div class="text-xs text-gray-500 truncate w-48">${post.postContent}</div>
                                </div>
                            </div>
                            <button class="deletePostBtn text-red-500 text-sm" data-id="${post.id}">删除</button>
                        </div>
                    `).join('')}
                </div>
            </div>

        </div>
    `;
}

// ==========================================
// 👇 [v1.3.1 优化版] 数据统计 (打印友好 + 优雅UI)
// ==========================================
function renderStats(config, services, bookings, customers, orders) {
    const safeOrders = orders || getDataByType('order');
    const safeBookings = bookings || [];
    
    // 日期过滤函数
    const isWithinDateRange = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr).toISOString().split('T')[0];
        return d >= statsStartDate && d <= statsEndDate;
    };

    // 1. 过滤预约 (已完成 & 日期内)
    let filteredBookings = safeBookings.filter(b => {
        // 如果有 completedAt (实际完成时间) 就用它，否则用预约日期
        const effectiveDate = b.completedAt || b.appointmentDate;
        return b.status === 'completed' && isWithinDateRange(effectiveDate);
    });

    // 2. 搜索过滤
    if (statsSearchQuery) {
        const lowerQ = statsSearchQuery.toLowerCase();
        filteredBookings = filteredBookings.filter(b => 
            (b.receiptNumber && b.receiptNumber.toLowerCase().includes(lowerQ)) ||
            b.customerName.toLowerCase().includes(lowerQ) ||
            b.serviceName.toLowerCase().includes(lowerQ)
        );
    }

    // 3. 过滤订单
    const filteredOrders = safeOrders.filter(o => o.status === 'completed' && isWithinDateRange(o.createdAt));
    
    // 4. 计算金额
    const serviceRevenue = filteredBookings.reduce((sum, b) => sum + (parseFloat(b.totalAmount) || 0), 0);
    const productRevenue = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    const totalRevenue = serviceRevenue + productRevenue;

    // 5. 商品销量排行
    const productStats = {};
    filteredOrders.forEach(order => {
        order.items.forEach(item => {
            if (!productStats[item.name]) productStats[item.name] = { quantity: 0, revenue: 0 };
            productStats[item.name].quantity += item.quantity;
            productStats[item.name].revenue += (item.price * item.quantity);
        });
    });
    const sortedProducts = Object.entries(productStats)
        .map(([name, stat]) => ({ name, ...stat }))
        .sort((a, b) => b.revenue - a.revenue);

    return `
        <div class="min-h-full print:bg-white">
            
            <header class="bg-white shadow-sm sticky top-0 z-10 border-b-2 print:hidden" style="border-color: ${config.primary_action_color};">
                <div class="max-w-7xl mx-auto px-4 py-4">
                    <div class="flex justify-between items-center mb-4">
                        <h1 class="text-xl font-bold" style="color: ${config.text_color};">📊 数据统计</h1>
                        <div class="flex gap-2">
                            <button onclick="window.print()" class="px-4 py-2 rounded-lg text-white text-sm font-bold shadow-md hover:opacity-90 transition-opacity" style="background-color: ${config.secondary_action_color};">
                                🖨️ 打印报表
                            </button>
                            <button onclick="currentView='manage'; renderApp()" class="px-4 py-2 rounded-lg border-2 text-sm font-bold hover:bg-gray-50 transition-colors" style="border-color: ${config.primary_action_color}; color: ${config.primary_action_color};">
                                返回
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-4 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div class="flex-1 min-w-[200px]">
                            <label class="block text-xs font-bold text-gray-500 mb-1">🔍 搜索单号 / 客户</label>
                            <input type="text" value="${statsSearchQuery}" 
                                oninput="statsSearchQuery = this.value; renderApp()"
                                placeholder="输入 MY-2501... 或 名字"
                                class="w-full px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:border-pink-500">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">开始日期</label>
                            <input type="date" id="statsStartInput" value="${statsStartDate}" class="px-3 py-2 rounded border border-gray-300 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">结束日期</label>
                            <input type="date" id="statsEndInput" value="${statsEndDate}" class="px-3 py-2 rounded border border-gray-300 text-sm">
                        </div>
                        <button onclick="statsStartDate = document.getElementById('statsStartInput').value; statsEndDate = document.getElementById('statsEndInput').value; renderApp()" 
                            class="px-6 py-2 rounded text-white font-bold text-sm shadow-sm hover:opacity-90"
                            style="background: ${config.primary_action_color};">查询</button>
                    </div>
                </div>
            </header>

            <div class="hidden print:block mb-8 text-center pt-4">
                <h1 class="text-2xl font-bold text-black mb-1">${config.app_title} - 营收报表</h1>
                <p class="text-sm text-gray-600 font-mono">${statsStartDate} 至 ${statsEndDate}</p>
                <div class="border-b-2 border-black w-1/3 mx-auto mt-2"></div>
            </div>

            <main class="max-w-7xl mx-auto px-4 py-6 print:p-0">
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:grid-cols-3 print:gap-4">
                    
                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between print:border print:border-gray-300 print:shadow-none">
                        <div>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Total Revenue</p>
                            <p class="text-sm font-bold text-gray-600">总收入</p>
                        </div>
                        <h3 class="text-2xl font-bold font-mono" style="color: ${config.primary_action_color};">
                            RM${totalRevenue.toFixed(2)}
                        </h3>
                    </div>

                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between print:border print:border-gray-300 print:shadow-none">
                        <div>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Products Sold</p>
                            <p class="text-sm font-bold text-gray-600">商品销量</p>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800">
                            ${filteredOrders.length} <span class="text-sm text-gray-400 font-normal">单</span>
                        </h3>
                    </div>

                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between print:border print:border-gray-300 print:shadow-none">
                        <div>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Services Done</p>
                            <p class="text-sm font-bold text-gray-600">服务单数</p>
                        </div>
                        <h3 class="text-2xl font-bold text-gray-800">
                            ${filteredBookings.length} <span class="text-sm text-gray-400 font-normal">单</span>
                        </h3>
                    </div>

                </div>

                <div class="bg-white p-6 rounded-xl shadow-md mb-8 print:shadow-none print:border print:border-gray-300 print:p-0">
                    <h3 class="text-lg font-bold mb-4 border-b pb-2 print:text-base print:mb-2">💆‍♀️ 服务账单明细</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse print:text-xs">
                            <thead>
                                <tr class="text-sm text-gray-500 border-b bg-gray-50 print:bg-gray-100">
                                    <th class="py-3 pl-2">日期 & 时间</th>
                                    <th class="py-3">单号</th>
                                    <th class="py-3">客户</th>
                                    <th class="py-3">支付方式</th> 
                                    <th class="py-3">项目</th>
                                    <th class="py-3 text-right pr-2">金额</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredBookings.length === 0 ? `<tr><td colspan="6" class="text-center py-8 text-gray-400">无记录</td></tr>` : 
                                filteredBookings.sort((a, b) => new Date(b.completedAt || b.appointmentDate) - new Date(a.completedAt || a.appointmentDate)).map(b => {
                                    const isRealTime = !!b.completedAt;
                                    const dateObj = new Date(isRealTime ? b.completedAt : b.appointmentDate);
                                    const dateStr = dateObj.toLocaleDateString();
                                    const timeStr = isRealTime ? dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : (b.appointmentTime || '');
                                    
                                    let payBadge = '-';
                                    if(b.paymentMethod === 'TNG') payBadge = '<span class="px-2 py-1 rounded bg-blue-100 text-blue-600 text-xs font-bold print:border print:border-gray-300 print:bg-white print:text-black">TNG</span>';
                                    else if(b.paymentMethod === 'Cash') payBadge = '<span class="px-2 py-1 rounded bg-green-100 text-green-600 text-xs font-bold print:border print:border-gray-300 print:bg-white print:text-black">Cash</span>';
                                    else if(b.paymentMethod) payBadge = b.paymentMethod;

                                    return `
                                    <tr class="border-b last:border-0 hover:bg-gray-50 transition-colors print:border-gray-200">
                                        <td class="py-3 pl-2 text-sm print:py-2">
                                            <div class="font-bold text-gray-700">${dateStr}</div>
                                            <div class="text-xs ${isRealTime ? 'text-green-600 font-bold print:text-black' : 'text-gray-400'}">${timeStr}</div>
                                        </td>
                                        <td class="py-3 text-sm font-mono font-bold text-gray-500 print:text-black print:py-2">${b.receiptNumber || '-'}</td>
                                        <td class="py-3 text-sm font-medium print:py-2">${b.customerName}</td>
                                        <td class="py-3 text-sm print:py-2">${payBadge}</td> 
                                        <td class="py-3 text-sm text-gray-600 print:py-2 max-w-[150px] truncate">${b.serviceName}</td>
                                        <td class="py-3 text-sm font-bold text-right pr-2 print:py-2" style="color: ${config.primary_action_color};">RM${parseFloat(b.totalAmount).toFixed(2)}</td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-xl shadow-md print:shadow-none print:border print:border-gray-300 print:p-0 print:break-inside-avoid">
                    <h3 class="text-lg font-bold mb-4 border-b pb-2 print:text-base print:mb-2">🛍️ 商品销售统计</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse print:text-xs">
                            <thead>
                                <tr class="text-sm text-gray-500 border-b print:bg-gray-100">
                                    <th class="py-2">商品名称</th>
                                    <th class="py-2 text-center">销量 (件)</th>
                                    <th class="py-2 text-right">总销售额</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedProducts.length === 0 ? `<tr><td colspan="3" class="text-center py-4 text-gray-400">无记录</td></tr>` : 
                                sortedProducts.map(p => `
                                    <tr class="border-b last:border-0 hover:bg-gray-50 print:border-gray-200">
                                        <td class="py-3 text-sm font-medium print:py-2">${p.name}</td>
                                        <td class="py-3 text-sm text-center bg-gray-50 rounded-lg font-bold text-gray-600 print:bg-white print:border print:border-gray-200 print:py-2">${p.quantity}</td>
                                        <td class="py-3 text-sm font-bold text-right print:py-2" style="color: ${config.secondary_action_color};">RM${p.revenue.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    `;
}

// ==========================================
// 👇 客户管理列表 (已改为表格样式 + 显示电话)
// ==========================================
function renderCustomersManagement(config, customers, bookings) {
    return `
        <div class="p-4">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold" style="color: ${config.primary_action_color};">👥 客户管理</h2>
                <button id="addCustomerBtn" class="px-6 py-2 rounded-lg text-white font-bold shadow-md" 
                    style="background: ${config.primary_action_color};">
                    + 添加客户
                </button>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 border-b">
                        <tr>
                            <th class="p-4 text-gray-500">用户名</th>
                            <th class="p-4 text-gray-500">电话</th> <th class="p-4 text-gray-500">等级</th>
                            <th class="p-4 text-gray-500 text-center">积分</th>
                            <th class="p-4 text-gray-500 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.length === 0 ? `
                            <tr><td colspan="5" class="p-8 text-center text-gray-400">暂无客户</td></tr>
                        ` : customers.map(acc => `
                            <tr class="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                <td class="p-4 font-bold text-gray-700">
                                    <div class="flex items-center gap-2">
                                        <div class="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                            <img src="${acc.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'}" class="w-full h-full object-cover">
                                        </div>
                                        ${acc.username}
                                    </div>
                                </td>
                                <td class="p-4 text-gray-600 font-mono">${acc.phone || '-'}</td> <td class="p-4">${getMembershipBadge(acc.membershipLevel, config)}</td>
                                <td class="p-4 text-center font-bold text-purple-600">${acc.points}</td>
                                <td class="p-4 text-right">
                                    <button onclick="showEditCustomerModal(elementSdk.config, getDataByType('customer_account').find(c => c.id === '${acc.id}'))" 
                                        class="text-blue-500 font-bold border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors">
                                        ✏️ 编辑
                                    </button>
                                    <button class="deleteCustomerBtn text-red-500 font-bold border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition-colors ml-2" 
                                        data-customer-id="${acc.id}">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ==========================================
// 👇 设置页面 (v1.1.0 升级版：底部吸附栏 + UI修复)
// ==========================================
function renderSettings(config) {
    const discountSettings = getDiscountSettings();
    const owners = getDataByType('owner_credentials');
    const currentOwner = owners.length > 0 ? owners[0] : ownerCredentials;

    return `
        <div class="pb-32">
            <div class="flex items-center gap-3 mb-6">
                <h2 style="font-size: ${config.font_size * 2}px; font-weight: 700; color: ${config.primary_action_color}; margin-bottom: 0;">
                    ⚙️ 系统设置
                </h2>
                
                ${(() => {
                    const currentVersion = 'v1.3.1';
                    // 检查是否已读
                    const lastSeen = localStorage.getItem('gembrow_last_seen_version');
                    const showBadge = lastSeen !== currentVersion;

                    return `
                    <button onclick="handleVersionClick(elementSdk.config, '${currentVersion}')" 
                        class="px-3 py-1 rounded-full bg-pink-100 text-pink-600 text-xs font-bold hover:bg-pink-200 transition-colors cursor-pointer relative group">
                        ${currentVersion}
                        
                        ${showBadge ? `
                            <span id="versionBadge" class="absolute -top-1 -right-1 flex h-3 w-3">
                              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                              <span class="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                            </span>
                        ` : ''}
                        
                        <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            点击查看更新内容
                        </div>
                    </button>
                    `;
                })()}
                </div>
            
            <form id="discountSettingsForm">
                
                <div class="mb-6 p-6 rounded-2xl bg-red-50 border-2 border-red-100 shadow-sm">
                    <h3 class="mb-4 font-bold text-lg text-red-600 border-b border-red-200 pb-2 flex items-center gap-2">
                        🔐 管理员账号安全
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="mb-2">
                            <label class="block mb-1 text-sm font-bold text-gray-600">管理员用户名 (Login ID)</label>
                            <input type="text" id="adminUsername" value="${currentOwner.username}" required
                                class="w-full px-3 py-2 rounded border focus:outline-none focus:border-red-500 bg-white font-bold text-gray-700">
                        </div>
                        <div class="mb-2">
                            <label class="block mb-1 text-sm font-bold text-gray-600">新密码 (Password)</label>
                            <input type="text" id="adminPassword" value="${currentOwner.password}" required
                                class="w-full px-3 py-2 rounded border focus:outline-none focus:border-red-500 bg-white font-bold text-gray-700">
                        </div>
                    </div>
                </div>

                <div class="mb-6 p-6 rounded-2xl bg-white shadow-sm">
                    <h3 class="mb-4 font-bold text-lg text-gray-800 border-b pb-2">🖼️ 品牌 Logo 设置</h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="flex flex-col items-center p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 hover:border-pink-300 transition-colors">
                            <label class="mb-2 text-sm font-bold text-gray-600">🏠 登录页 Logo (大图)</label>
                            <div class="w-32 h-32 mb-3 bg-white rounded-lg shadow-sm flex items-center justify-center overflow-hidden border border-gray-100 cursor-pointer relative group"
                                 onclick="document.getElementById('logoLoginInput').click()">
                                <img id="loginLogoPreviewImg" src="${discountSettings.logo_login || discountSettings.logo_url || ''}" class="w-full h-full object-contain" style="display: ${discountSettings.logo_login || discountSettings.logo_url ? 'block' : 'none'}">
                                <span id="loginLogoPlaceholder" style="display: ${discountSettings.logo_login || discountSettings.logo_url ? 'none' : 'block'}" class="text-4xl opacity-20">➕</span>
                                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center transition-all">
                                    <span class="text-xs text-gray-500 opacity-0 group-hover:opacity-100 bg-white px-2 py-1 rounded-full shadow-sm">点击更换</span>
                                </div>
                            </div>
                            <input type="file" id="logoLoginInput" accept="image/*" style="display: none;">
                            <input type="hidden" id="logoLoginUrl" value="${discountSettings.logo_login || discountSettings.logo_url || ''}">
                        </div>

                        <div class="flex flex-col items-center p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 hover:border-pink-300 transition-colors">
                            <label class="mb-2 text-sm font-bold text-gray-600">🔝 顶部菜单 Logo (小图)</label>
                            <div class="w-32 h-32 mb-3 bg-white rounded-lg shadow-sm flex items-center justify-center overflow-hidden border border-gray-100 cursor-pointer relative group"
                                 onclick="document.getElementById('logoHeaderInput').click()">
                                <img id="headerLogoPreviewImg" src="${discountSettings.logo_header || ''}" class="w-full h-full object-contain" style="display: ${discountSettings.logo_header ? 'block' : 'none'}">
                                <span id="headerLogoPlaceholder" style="display: ${discountSettings.logo_header ? 'none' : 'block'}" class="text-4xl opacity-20">➕</span>
                                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center transition-all">
                                    <span class="text-xs text-gray-500 opacity-0 group-hover:opacity-100 bg-white px-2 py-1 rounded-full shadow-sm">点击更换</span>
                                </div>
                            </div>
                            <input type="file" id="logoHeaderInput" accept="image/*" style="display: none;">
                            <input type="hidden" id="logoHeaderUrl" value="${discountSettings.logo_header || ''}">
                        </div>
                    </div>
                </div>

                <div class="mb-6 p-6 rounded-2xl bg-white shadow-sm">
                    <h3 class="mb-4 font-bold text-lg text-gray-800 border-b pb-2">🏢 店铺与商家信息</h3>
                    
                    <div class="mb-4">
                        <label class="block mb-1 text-sm font-bold text-gray-600">店铺名称</label>
                        <input type="text" id="shopName" value="${discountSettings.shop_name || config.app_title}" class="w-full px-3 py-2 rounded border">
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <div>
                            <label class="block mb-1 text-sm font-bold text-green-600">WhatsApp (会自动格式化)</label>
                            <input type="text" id="waNumber" value="${discountSettings.wa_number || ''}" 
                                onchange="this.value = cleanPhoneNumber(this.value)"
                                placeholder="e.g. 0123456789"
                                class="w-full px-3 py-2 rounded border border-green-200 bg-green-50">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">SSM 注册号</label>
                            <input type="text" id="ssmNumber" value="${discountSettings.ssm_number || ''}" class="w-full px-3 py-2 rounded border">
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block mb-1 text-sm font-bold text-gray-600">店铺地址</label>
                        <textarea id="shopAddress" rows="2" class="w-full px-3 py-2 rounded border">${discountSettings.shop_address || ''}</textarea>
                    </div>

                    <div class="mb-4">
                        <label class="block mb-1 text-sm font-bold text-gray-600">Google Map 导航链接</label>
                        <input type="text" id="mapLink" value="${discountSettings.map_link || ''}" placeholder="http://googleusercontent.com/maps.google.com/..." class="w-full px-3 py-2 rounded border">
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block mb-1 text-sm font-bold text-blue-800">Facebook 链接</label>
                            <input type="text" id="fbLink" value="${discountSettings.fb_link || ''}" class="w-full px-3 py-2 rounded border">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-pink-600">Instagram 链接</label>
                            <input type="text" id="igLink" value="${discountSettings.ig_link || ''}" class="w-full px-3 py-2 rounded border">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-black">TikTok 链接</label>
                            <input type="text" id="tiktokLink" value="${discountSettings.tiktok_link || ''}" class="w-full px-3 py-2 rounded border">
                        </div>
                    </div>
                </div>

                <div class="mb-6 p-6 rounded-2xl bg-blue-50 border-2 border-blue-100 shadow-sm">
                    <h3 class="mb-4 font-bold text-lg text-blue-800 border-b border-blue-200 pb-2">🧾 财务与税务 (SST)</h3>
                    
                    <div class="flex items-center justify-between mb-4">
                        <span class="font-bold text-gray-700">启用 SST 税务计算</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="enableSST" class="sr-only peer" ${discountSettings.enable_sst ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">SST 税率 (%)</label>
                            <input type="number" id="sstRate" value="${discountSettings.sst_rate || 6}" class="w-full px-3 py-2 rounded border">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">SST 注册号</label>
                            <input type="text" id="sstID" value="${discountSettings.sst_id || ''}" class="w-full px-3 py-2 rounded border">
                        </div>
                    </div>

                    <div class="flex items-center justify-between">
                        <span class="font-bold text-sm text-gray-600">在收据上显示 SST 金额?</span>
                        <input type="checkbox" id="showSSTOnReceipt" ${discountSettings.show_sst_on_receipt ? 'checked' : ''} class="w-5 h-5 accent-blue-600">
                    </div>

                    <div class="mb-6">
                        <label class="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Touch 'n Go QR Code</label>
                        <div class="relative group cursor-pointer w-48 h-48 mx-auto" onclick="document.getElementById('tngQrInput').click()">
                            
                            <img id="tngQrPreview" 
                                 src="${discountSettings.tng_qr_url || ''}" 
                                 class="w-full h-full object-cover rounded-xl border-2 border-dashed border-blue-300 shadow-sm ${discountSettings.tng_qr_url ? 'block' : 'hidden'}">
                            
                            <div id="tngQrPlaceholder" 
                                 class="absolute inset-0 flex flex-col items-center justify-center bg-blue-50 rounded-xl border-2 border-dashed border-blue-300 ${discountSettings.tng_qr_url ? 'hidden' : 'flex'}">
                                 <span class="text-4xl mb-2">📷</span>
                                 <p class="text-xs text-blue-500 font-bold">点击上传二维码</p>
                                 <p class="text-[10px] text-gray-400 mt-1">支持拖拽裁剪</p>
                            </div>

                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-xl flex items-center justify-center">
                                <span class="text-white opacity-0 group-hover:opacity-100 font-bold text-sm bg-black/50 px-3 py-1 rounded-full">更换图片</span>
                            </div>

                            <input type="hidden" id="tngQrUrl" value="${discountSettings.tng_qr_url || ''}">
                            <input type="file" id="tngQrInput" accept="image/*" class="hidden">
                        </div>
                    </div>

                <div class="mb-6 p-6 rounded-2xl bg-purple-50 border-2 border-purple-100 shadow-sm">
                    <h3 class="mb-4 font-bold text-lg text-purple-800 border-b border-purple-200 pb-2">⭐ 积分与会员等级</h3>
                    <div class="flex items-center justify-between mb-6">
                        <span class="font-bold text-gray-700">启用积分系统</span>
                        <input type="checkbox" id="enableRewards" ${discountSettings.enable_rewards !== false ? 'checked' : ''} class="w-5 h-5 accent-purple-500">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div><label class="block text-xs font-bold text-purple-600">铜牌积分/折扣</label><div class="flex gap-2"><input type="number" id="bronzePoints" value="${discountSettings.bronze_points||0}" class="w-1/2 p-2 rounded border"><input type="number" id="bronzeDiscount" value="${discountSettings.bronze_discount||0}" class="w-1/2 p-2 rounded border"></div></div>
                        <div><label class="block text-xs font-bold text-gray-600">银牌积分/折扣</label><div class="flex gap-2"><input type="number" id="silverPoints" value="${discountSettings.silver_points||100}" class="w-1/2 p-2 rounded border"><input type="number" id="silverDiscount" value="${discountSettings.silver_discount||5}" class="w-1/2 p-2 rounded border"></div></div>
                        <div><label class="block text-xs font-bold text-yellow-600">金牌积分/折扣</label><div class="flex gap-2"><input type="number" id="goldPoints" value="${discountSettings.gold_points||300}" class="w-1/2 p-2 rounded border"><input type="number" id="goldDiscount" value="${discountSettings.gold_discount||10}" class="w-1/2 p-2 rounded border"></div></div>
                        <div><label class="block text-xs font-bold text-cyan-600">白金积分/折扣</label><div class="flex gap-2"><input type="number" id="platinumPoints" value="${discountSettings.platinum_points||600}" class="w-1/2 p-2 rounded border"><input type="number" id="platinumDiscount" value="${discountSettings.platinum_discount||15}" class="w-1/2 p-2 rounded border"></div></div>
                    </div>
                    <div>
                        <label class="block mb-1 text-xs font-bold text-gray-600">积分兑换比 (10 积分 = ? RM)</label>
                        <input type="number" id="pointsToRmRate" value="${discountSettings.points_to_rm_rate || 10}" class="w-full px-3 py-2 rounded border">
                    </div>
                </div>

                <div class="mb-6 p-6 rounded-2xl bg-green-50 border-2 border-green-100 shadow-sm">
                    <h3 class="mb-4 font-bold text-lg text-green-800 border-b border-green-200 pb-2">🛍️ 商品管理</h3>
                    <div class="flex items-center justify-between">
                        <span class="font-bold">启用商品功能</span>
                        <input type="checkbox" id="enableShop" ${discountSettings.enable_shop !== false ? 'checked' : ''} class="w-5 h-5 accent-green-500">
                    </div>
                </div>

                <div class="mb-6 p-6 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300">
                    <h3 class="mb-2 font-bold text-gray-700">💾 数据备份</h3>
                    <div class="flex gap-4">
                        <button type="button" onclick="exportData()" class="flex-1 py-3 rounded-lg bg-gray-600 text-white font-bold">⬇️ 导出</button>
                        <button type="button" onclick="document.getElementById('importFile').click()" class="flex-1 py-3 rounded-lg bg-white border font-bold">⬆️ 恢复</button>
                        <input type="file" id="importFile" accept=".json" style="display: none;" onchange="importData(this)">
                    </div>
                </div>

                <div class="mb-6 p-6 rounded-2xl bg-gray-50 border-2 border-gray-200">
                    <h3 class="mb-4 font-bold text-lg text-gray-800 border-b pb-2 flex items-center gap-2">
                        📜 店铺条款与声明 (Policies)
                        <span class="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded">支持自定义</span>
                    </h3>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block mb-2 text-xs font-bold text-gray-600 uppercase">服务条款 (Terms & Conditions)</label>
                            <textarea id="customTerms" rows="4" placeholder="默认使用系统标准条款。如需修改，请在此输入..." 
                                class="w-full px-4 py-3 rounded-lg border focus:border-gray-500 text-sm"
                                style="font-family: monospace;">${discountSettings.custom_terms || ''}</textarea>
                            <p class="text-[10px] text-gray-400 mt-1">留空则显示系统默认的“免责声明、迟到规则”等。</p>
                        </div>

                        <div>
                            <label class="block mb-2 text-xs font-bold text-gray-600 uppercase">隐私政策 (Privacy Policy)</label>
                            <textarea id="customPrivacy" rows="3" placeholder="默认使用系统标准隐私政策..." 
                                class="w-full px-4 py-3 rounded-lg border focus:border-gray-500 text-sm"
                                style="font-family: monospace;">${discountSettings.custom_privacy || ''}</textarea>
                        </div>

                        <div>
                            <label class="block mb-2 text-xs font-bold text-gray-600 uppercase">售后与退款 (Return & Refund)</label>
                            <textarea id="customReturn" rows="3" placeholder="默认使用系统标准退换货政策..." 
                                class="w-full px-4 py-3 rounded-lg border focus:border-gray-500 text-sm"
                                style="font-family: monospace;">${discountSettings.custom_return || ''}</textarea>
                        </div>
                    </div>
                </div>

                <div class="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 flex gap-4 items-center justify-center z-40 border-t border-gray-100">
                    
                    <button type="submit" class="w-full max-w-md py-4 rounded-xl font-bold text-white shadow-lg text-lg transform active:scale-95 transition-transform flex items-center justify-center gap-2" 
                        style="background: ${config.primary_action_color};">
                        <span>💾 保存所有设置</span>
                    </button>
                </div>
         </form>     
     </div>
    `;
}

function renderCustomerView(config, services, bookings, posts) {
    if (currentView === 'mybookings' && loggedInCustomerName) {
        return renderMyBookings(config, bookings);
    } else if (currentView === 'history' && loggedInCustomerName) { // ✅ 新增这行
        return renderHistoryPage(config);
    } else if (currentView === 'profile' && loggedInCustomerName) {
        return renderProfile(config, bookings);
    }

    const customerAccount = loggedInCustomerName ? 
        getDataByType('customer_account').find(acc => acc.username === loggedInCustomerName) : null;
    const memberDiscount = customerAccount ? getMembershipDiscount(customerAccount.membershipLevel) : 0;
    const products = getDataByType('product');
    
    const settings = getDiscountSettings();
    const isShopEnabled = settings.enable_shop !== false;
    
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return `
        <div>
            ${customerAccount && memberDiscount > 0 ? `
                <div class="mb-8 text-center p-6" style="background: linear-gradient(135deg, ${config.primary_action_color}22 0%, ${config.secondary_action_color}22 100%); border-radius: 16px; border: 2px solid ${config.primary_action_color};">
                    <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 1.2}px; color: ${config.text_color}; font-weight: 600;">
                        🎉 您的${getMembershipBadge(customerAccount.membershipLevel, config)}享受 <span style="color: ${config.primary_action_color}; font-size: ${config.font_size * 1.4}px;">${memberDiscount * 100}%折扣</span> 优惠！
                    </p>
                </div>
            ` : ''}
            
            <h2 class="mb-8 text-center" style="font-size: ${config.font_size * 2}px; font-weight: 700; background: linear-gradient(135deg, ${config.primary_action_color} 0%, ${config.secondary_action_color} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                我们的服务
            </h2>
            
            ${services.length === 0 ? `
                <div class="text-center py-16" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px;">
                    <div style="font-size: 60px;">💅</div>
                    <p style="font-family: Lato, sans-serif; opacity: 0.6;">精彩服务即将推出</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    ${services.map(service => {
                        const rating = getServiceRating(service.id);
                        const ratingCount = getDataByType('rating').filter(r => r.serviceId === service.id).length;
                        const originalPrice = service.price;
                        const discountedPrice = memberDiscount > 0 ? (originalPrice * (1 - memberDiscount)).toFixed(2) : null;
                        const displayImage = service.imageUrl || './assets/default_eye.png';

                        return `
                            <div class="service-card group" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                <div style="height: 240px; overflow: hidden;">
                                    <img src="${displayImage}" 
                                         class="transition-transform duration-500 group-hover:scale-110"
                                         style="width: 100%; height: 100%; object-fit: cover;" 
                                         onerror="this.src='./assets/default_eye.png'">
                                </div>
                                <div class="p-6 relative bg-white">
                                    <div class="flex justify-between items-start mb-2">
                                        <h3 style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.primary_action_color};">
                                            ${service.name}
                                        </h3>
                                        ${rating > 0 ? `
                                            <div class="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
                                                <span class="text-yellow-500 font-bold mr-1">★ ${rating}</span>
                                                <span class="text-xs text-gray-400">(${ratingCount})</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                    
                                    <p class="mb-4 line-clamp-2" style="opacity: 0.8; height: 3em;">${service.description}</p>
                                    
                                    <div class="flex items-center justify-between mb-6">
                                        <p style="font-size: ${config.font_size * 1.5}px; color: ${config.primary_action_color}; font-weight: 700;">
                                            ${discountedPrice ? `<span style="text-decoration: line-through; opacity: 0.5; font-size: ${config.font_size}px; color: ${config.text_color};">RM${originalPrice}</span> RM${discountedPrice}` : `RM${originalPrice}`}
                                        </p>
                                        ${service.duration > 0 ? `<span style="background: ${config.primary_action_color}11; color: ${config.primary_action_color}; padding: 4px 10px; border-radius: 20px;">⏱️ ${service.duration}分</span>` : ''}
                                    </div>
                                    <button class="bookServiceBtn btn-primary w-full py-3 rounded-lg" data-service-id="${service.id}" data-service-name="${service.name}" data-service-price="${discountedPrice || originalPrice}" style="background: ${config.primary_action_color}; color: #ffffff;">立即预约 ✨</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
            
            ${products.length > 0 ? `
                <h2 class="mb-8 text-center" style="font-size: ${config.font_size * 2}px; font-weight: 700; background: linear-gradient(135deg, ${config.primary_action_color} 0%, ${config.secondary_action_color} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    好物推荐
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-16">
                    ${products.map(product => {
                        const displayImage = product.imageUrl || './assets/default_eye.png';
                        return `
                            <div class="product-card group" data-id="${product.id}" style="background: rgba(255, 255, 255, 0.95); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); cursor: pointer;">
                                <div style="height: 180px; overflow: hidden; background: #f9fafb;"> 
                                    <img src="${displayImage}" 
                                         class="transition-transform duration-500 group-hover:scale-110"
                                         style="width: 100%; height: 100%; object-fit: contain;" 
                                         onerror="this.src='./assets/default_eye.png'">
                                </div>
                                <div class="p-4 relative bg-white">
                                    <h3 class="mb-1" style="font-size: ${config.font_size * 1.1}px; font-weight: 700; color: ${config.text_color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${product.name}
                                    </h3>
                                    <p class="mb-3" style="font-size: ${config.font_size * 1.2}px; color: ${config.primary_action_color}; font-weight: 700;">
                                        RM${product.price}
                                    </p>
                                    
                                    ${isShopEnabled ? `
                                        <button class="addToCartBtn w-full py-2 rounded-lg" 
                                            data-id="${product.id}"
                                            style="background: ${config.secondary_action_color}; color: #ffffff; font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px;">
                                            加入购物车 🛒
                                        </button>
                                    ` : `
                                        <div style="text-align: center; color: ${config.secondary_action_color}; font-size: 12px; opacity: 0.7;">
                                            查看详情 >
                                        </div>
                                    `}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}

            <h2 class="mt-8 mb-8 text-center" style="font-size: ${config.font_size * 2}px; font-weight: 700; background: linear-gradient(135deg, ${config.primary_action_color} 0%, ${config.secondary_action_color} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                ${config.posts_title}
            </h2>
            
            ${posts.length === 0 ? `
                        <div class="text-center py-16" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px;">
                            <div style="font-size: 60px;">✨</div>
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 1.1}px; color: ${config.text_color}; opacity: 0.6;">
                                暂无动态分享
                            </p>
                        </div>
                    ` : `
                        <div class="space-y-8">
                            ${posts.slice().reverse().map(post => `
                                <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                    ${post.imageUrl ? `
                                        <div style="width: 100%;">
                                            <img src="${post.imageUrl}" style="width: 100%; height: auto; display: block;" onerror="this.style.display='none'">
                                        </div>
                                    ` : ''}
                                    <div class="p-8">
                                        <h3 class="mb-4" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                                            ${post.postTitle}
                                        </h3>
                                        <p class="mb-4" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 1.05}px; color: ${config.text_color}; opacity: 0.8; line-height: 1.8; white-space: pre-wrap;">${post.postContent}</p>
                                        <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color}; opacity: 0.5;">
                                            ${new Date(post.createdAt).toLocaleString('zh-CN')}
                                        </p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
            
            ${isShopEnabled ? `
                <div id="cartFab" class="fixed bottom-8 right-6 z-40 cursor-pointer shadow-lg hover:scale-110 transition-transform"
                    style="background: ${config.secondary_action_color}; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4px solid #fff;">
                    <span style="font-size: 24px;">🛒</span>
                    ${cartCount > 0 ? `
                        <div style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid #fff;">
                            ${cartCount}
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

// ==========================================
// 👇 修复版：我的预约 (只显示待服务，历史去隔壁看)
// ==========================================
function renderMyBookings(config, bookings) {
    // --- 1. 处理预约 (只看 Pending) ---
    const myPendingBookings = bookings.filter(b => 
        b.customerName === loggedInCustomerName && 
        b.status === 'pending' // 只显示等待中的
    ).sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));

    // --- 2. 处理订单 (只看 Pending) ---
    const allOrders = getDataByType('order');
    const myPendingOrders = allOrders.filter(o => 
        o.customerName === loggedInCustomerName && 
        o.status === 'pending' // 只显示待处理的
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return `
        <div class="max-w-md mx-auto animate-fade-in pb-20">
            <h2 class="text-2xl font-bold mb-6 text-center" style="color: ${config.primary_action_color};">
                ⏳ 我的待办事项
            </h2>

            <div class="mb-8">
                <h3 class="font-bold text-lg mb-4 flex items-center gap-2 opacity-80">
                    <span>📅 预约服务</span>
                    ${myPendingBookings.length > 0 ? `<span class="bg-pink-100 text-pink-600 text-xs px-2 py-1 rounded-full">${myPendingBookings.length}</span>` : ''}
                </h3>

                ${myPendingBookings.length === 0 ? `
                    <div class="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 opacity-60">
                        <p class="text-sm text-gray-500">没有等待中的预约</p>
                        <button onclick="document.getElementById('viewServices').click()" class="text-pink-500 text-xs font-bold mt-2 hover:underline">去预约 &rarr;</button>
                    </div>
                ` : `
                    <div class="space-y-4">
                        ${myPendingBookings.map(booking => `
                            <div class="bg-white p-5 rounded-xl shadow-sm border-l-4 relative overflow-hidden group" 
                                style="border-color: ${config.secondary_action_color};">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="font-bold text-gray-800">${booking.serviceName}</h4>
                                    <span class="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-bold">等待到店</span>
                                </div>
                                <p class="text-gray-600 text-sm mb-3">
                                    📅 ${booking.appointmentDate} <span class="ml-2 font-bold text-gray-800">${booking.appointmentTime}</span>
                                </p>
                                <div class="flex justify-between items-center border-t border-gray-100 pt-3">
                                    <span class="font-bold text-pink-600">RM${booking.totalAmount}</span>
                                    <button class="cancelBookingBtn px-3 py-1 rounded-lg text-xs border border-red-200 text-red-500 hover:bg-red-50 font-bold" data-id="${booking.id}">
                                        取消
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <div>
                <h3 class="font-bold text-lg mb-4 flex items-center gap-2 opacity-80">
                    <span>📦 商品订单</span>
                    ${myPendingOrders.length > 0 ? `<span class="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">${myPendingOrders.length}</span>` : ''}
                </h3>

                ${myPendingOrders.length === 0 ? `
                    <div class="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 opacity-60">
                        <p class="text-sm text-gray-500">没有等待中的订单</p>
                    </div>
                ` : `
                    <div class="space-y-4">
                        ${myPendingOrders.map(order => `
                            <div class="bg-white p-5 rounded-xl shadow-sm border-l-4 relative overflow-hidden" 
                                style="border-color: #3b82f6;"> <div class="flex justify-between items-start mb-3">
                                    <span class="text-xs text-gray-400">
                                        下单: ${new Date(order.createdAt).toLocaleString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                                    </span>
                                    <span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600 font-bold">
                                        处理中 / 待发货
                                    </span>
                                </div>

                                <div class="bg-gray-50 p-3 rounded-lg mb-3">
                                    ${order.items.map(item => `
                                        <div class="flex justify-between text-sm mb-1">
                                            <span class="text-gray-700">${item.name} x${item.quantity}</span>
                                            <span>RM${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    `).join('')}
                                    <div class="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-gray-800">
                                        <span>总计</span>
                                        <span class="text-blue-600">RM${order.totalAmount}</span>
                                    </div>
                                </div>

                                <div class="text-right">
                                     <button class="cancelOrderBtn px-3 py-1 rounded-lg text-xs border border-red-200 text-red-500 hover:bg-red-50 font-bold" data-id="${order.id}">
                                        取消订单
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            
            <div class="mt-8 text-center">
                <p class="text-xs text-gray-400">想查看已完成的历史记录？</p>
                
                <button onclick="currentView = 'history'; renderApp()" class="text-sm font-bold text-pink-500 underline mt-1 hover:text-pink-600">
                    📜 去查看历史与账单
                </button>
            </div>
        </div>
    `;
}

// ==========================================
// 👇 个人中心 (显示头像)
// ==========================================
function renderProfile(config, bookings) {
    const customerAccount = getDataByType('customer_account').find(acc => acc.username === loggedInCustomerName);
    if (!customerAccount) return '';

    const myBookings = bookings.filter(b => b.customerName === loggedInCustomerName);
    const completedBookings = myBookings.filter(b => b.status === 'completed');
    const settings = getDiscountSettings();
    const showRewards = settings.enable_rewards !== false;

    // 默认头像 (如果没传就显示这个)
    const avatarUrl = customerAccount.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

    return `
        <div>
            <h2 class="mb-8" style="font-size: ${config.font_size * 2}px; font-weight: 700; color: ${config.primary_action_color};">
                我的账户
            </h2>
            
            <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 32px; max-width: 600px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; overflow: hidden;">
                 
                 <div style="position: absolute; top: 0; left: 0; right: 0; height: 80px; background: linear-gradient(135deg, ${config.primary_action_color}22, ${config.secondary_action_color}22);"></div>

                 <div class="relative flex flex-col items-center mb-6">
                    <div class="w-24 h-24 rounded-full border-4 bg-white shadow-md overflow-hidden mb-3" style="border-color: ${config.surface_color};">
                        <img src="${avatarUrl}" class="w-full h-full object-cover">
                    </div>
                    
                    <h3 style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.text_color};">
                        ${customerAccount.username}
                    </h3>
                    
                    ${showRewards ? `
                        <div class="mt-1">${getMembershipBadge(customerAccount.membershipLevel, config)}</div>
                    ` : ''}
                 </div>

                 <div class="space-y-3 text-center">
                      <p style="opacity: 0.8;">📧 ${customerAccount.email}</p>

                      ${showRewards ? `
                      <div class="flex justify-center gap-4 py-4 border-t border-b border-gray-100 my-4">
                          <div>
                              <div class="font-bold text-xl" style="color: ${config.primary_action_color};">${customerAccount.points}</div>
                              <div class="text-xs text-gray-400">积分</div>
                          </div>
                          <div class="w-px bg-gray-200"></div>
                          <div>
                              <div class="font-bold text-xl" style="color: ${config.secondary_action_color};">${getMembershipDiscountText(customerAccount.membershipLevel)}</div>
                              <div class="text-xs text-gray-400">当前折扣</div>
                          </div>
                      </div>
                      ` : ''}
                
                     <div class="grid grid-cols-2 gap-4 text-sm opacity-80 mb-6">
                         <div class="bg-gray-50 p-2 rounded">📅 总预约: <b>${myBookings.length}</b> 次</div>
                         <div class="bg-gray-50 p-2 rounded">✅ 已完成: <b>${completedBookings.length}</b> 次</div>
                     </div>
                
                     <button id="editProfileBtn" class="w-full btn-primary py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                         style="background: ${config.primary_action_color}; color: #ffffff; font-weight: bold;">
                         ✏️ 编辑个人资料 / 更换头像
                     </button>
                 </div>
                 
                 ${showRewards ? `
                 <div class="mt-8 pt-6 border-t border-gray-100">
                     <h4 class="font-bold mb-3 text-sm opacity-60">💎 会员等级说明</h4>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs opacity-70">
                         <div class="flex justify-between"><span>🥉 铜牌</span> <span>${settings.bronze_points}分 / ${settings.bronze_discount}%</span></div>
                         <div class="flex justify-between"><span>🥈 银牌</span> <span>${settings.silver_points}分 / ${settings.silver_discount}%</span></div>
                         <div class="flex justify-between"><span>🥇 金牌</span> <span>${settings.gold_points}分 / ${settings.gold_discount}%</span></div>
                         <div class="flex justify-between"><span>💎 白金</span> <span>${settings.platinum_points}分 / ${settings.platinum_discount}%</span></div>
                     </div>
                 </div>
                 ` : ''}
            </div>
        </div>
    `;
}

function attachEventListeners(config, services, bookings, posts) {
    // === 0. 菜单控制 (补回) ===
    
    // 打开菜单 (Menu Button)
    document.getElementById('menuBtn')?.addEventListener('click', () => {
        showMenu = true;
        renderApp();
    });

    // 关闭菜单 (Overlay) - 你的代码优化版
    document.getElementById('menuOverlay')?.addEventListener('click', (e) => {
        // 优化：只有点到半透明背景(ID匹配)时才关闭，点菜单里面的按钮不关闭
        if (e.target.id === 'menuOverlay') {
            showMenu = false;
            renderApp();
        }
    });

    // === 评价按钮监听 (新增) ===
    document.querySelectorAll('.rateServiceBtn, .rateServiceBtnCustomer').forEach(btn => {
        btn.addEventListener('click', () => {
            const bookings = getDataByType('booking');
            const booking = bookings.find(b => b.id === btn.dataset.bookingId);
            if (booking) {
                showRatingModal(config, booking);
            }
        });
    });

    // === 1. 全局导航/登录 ===
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // 1. 清除登录缓存 (防止刷新自动登录)
            localStorage.removeItem('gembrow_session');
            
            // 2. 重置状态
            loggedInCustomerName = null;
            currentMode = 'login'; // 回到登录页
            showMenu = false;      // 关闭菜单
            
            // 3. 刷新
            renderApp();
            showToast('已退出登录');
        });
    });

    document.getElementById('myBookingsBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        currentView = 'mybookings';
        renderApp();
    });
    
    document.getElementById('homeBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        currentView = 'home';
        renderApp();
    });

    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const phone = document.getElementById('phone').value;
        if (username === ownerCredentials.username && phone === ownerCredentials.password) {
            isOwner = true;
            loggedInCustomerName = null;
            currentView = 'manage'; 
        } else {
            isOwner = false;
            loggedInCustomerName = username;
            let customers = getDataByType('customer_account');
            let customer = customers.find(c => c.username === username);
            if (!customer) {
                createRecord({ type: 'customer_account', username, phone, membershipLevel: 'bronze', points: 0 });
            }
            currentView = 'home';
        }
        renderApp();
    });

    document.getElementById('guestLoginBtn')?.addEventListener('click', () => {
        isOwner = false;
        loggedInCustomerName = null;
        currentView = 'home';
        renderApp();
    });

    // === 菜单导航按钮 ===
    // 业主菜单按钮
    document.getElementById('viewManage')?.addEventListener('click', () => {
        currentView = 'manage';
        showMenu = false;
        renderApp();
    });
    document.getElementById('viewStats')?.addEventListener('click', () => {
        currentView = 'stats';
        showMenu = false;
        renderApp();
    });
    document.getElementById('viewCustomers')?.addEventListener('click', () => {
        currentView = 'customers';
        showMenu = false;
        renderApp();
    });
    document.getElementById('viewSettings')?.addEventListener('click', () => {
        currentView = 'settings';
        showMenu = false;
        renderApp();
    });
    // 客户菜单按钮
    document.getElementById('viewServices')?.addEventListener('click', () => {
        currentView = 'services';
        showMenu = false;
        renderApp();
    });
    document.getElementById('viewMyBookings')?.addEventListener('click', () => {
        currentView = 'mybookings';
        showMenu = false;
        renderApp();
    });

    document.getElementById('viewHistory')?.addEventListener('click', () => {
        currentView = 'history';
        showMenu = false;
        renderApp();
    });

    document.getElementById('viewProfile')?.addEventListener('click', () => {
        currentView = 'profile';
        showMenu = false;
        renderApp();
    });

    // === 休息时间 ===
    document.getElementById('blockTimeBtn')?.addEventListener('click', () => {
        // 复用 showBookingModal，但这次是老板给自己“占位”
        // 我们传入一个特殊的 serviceName 叫 "⛔ 休息/锁定"
        // 价格 0，时长可以让老板自己填 (这里简化为默认 60分钟，老板可以在弹窗里改)
        // 更好的做法是专门写个 showBlockTimeModal，但为了省事，我们可以直接伪造一个服务
        
        showBlockTimeModal(config); // 👇 下面有这个新函数
    });

    // === 1. 全局导航/登录 ===
    document.getElementById('addServiceBtn')?.addEventListener('click', () => {
        showServiceModal(config);
    });
    
    document.querySelectorAll('.editServiceBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const s = services.find(i => i.id === btn.dataset.id);
            if (s) showEditServiceModal(config, s);
        });
    });

    document.querySelectorAll('.deleteServiceBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const s = services.find(i => i.id === btn.dataset.id);
            if (s) showConfirmModal(config, `确定删除服务 "${s.name}" 吗？`, async () => deleteRecord(s));
        });
    });

    // === 4. 商品管理 (✅ 你的按钮就是这里修好的) ===
    document.getElementById('addProductBtn')?.addEventListener('click', () => {
        // 确保 showProductModal 函数存在
        if (typeof showProductModal === 'function') {
            showProductModal(config);
        } else {
            console.error("❌ 错误：找不到 showProductModal 函数，请检查代码底部是否复制完整！");
        }
    });

    document.querySelectorAll('.editProductBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const products = getDataByType('product');
            const p = products.find(i => i.id === btn.dataset.id);
            if (p) showEditProductModal(config, p);
        });
    });

    document.querySelectorAll('.deleteProductBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const products = getDataByType('product');
            const p = products.find(i => i.id === btn.dataset.id);
            if (p) showConfirmModal(config, `确定下架商品 "${p.name}" 吗？`, async () => deleteRecord(p));
        });
    });

    // === 3.5 客户管理 ===
    // 添加客户按钮
    document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
        showAddCustomerModal(config);
    });

    // 编辑客户按钮
    document.querySelectorAll('.editCustomerBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const customers = getDataByType('customer_account');
            // 注意：这里用的是 dataset.customerId，因为 HTML 里写的是 data-customer-id
            const c = customers.find(i => i.id === btn.dataset.customerId);
            if (c) showEditCustomerModal(config, c);
        });
    });

    // 删除客户按钮
    document.querySelectorAll('.deleteCustomerBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const customers = getDataByType('customer_account');
            const customer = customers.find(c => c.id === btn.dataset.customerId);
            if (customer) showConfirmModal(config, `确定删除客户 "${customer.username}" 及其所有数据吗？`, async () => deleteRecord(customer));
        });
    });

    // === 5. 动态管理 ===
    document.getElementById('addPostBtn')?.addEventListener('click', () => {
        if (typeof showPostModal === 'function') showPostModal(config);
    });

    document.querySelectorAll('.deletePostBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = posts.find(i => i.id === btn.dataset.id);
            if (p) showConfirmModal(config, "确定删除这条动态吗？", async () => deleteRecord(p));
        });
    });

    // === 6. 订单/预约处理 ===
    
    // 完成预约 (改为弹出日期选择框)
    document.querySelectorAll('.completeBookingBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const b = bookings.find(i => i.id === btn.dataset.id);
            if (b) {
                showCompleteBookingModal(config, b);
            }
        });
    });

    // 取消预约
    document.querySelectorAll('.cancelBookingBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const b = bookings.find(i => i.id === btn.dataset.id);
            if (b) showConfirmModal(config, "确定取消此预约？", async () => updateRecord(b, { 
                status: 'cancelled', 
                cancelledAt: new Date().toISOString() // 👈 加上这个，后悔药才能生效！
            }));
        });
    });

    // ↩️ 恢复待办 (后悔药功能)
    document.querySelectorAll('.revertBookingBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const b = bookings.find(i => i.id === btn.dataset.id);
            if (b) showConfirmModal(config, "确定要撤销完成状态，变回【待确认】吗？", async () => updateRecord(b, { status: 'pending', completedAt: null }));
        });
    });

    // 商品订单处理 (保持不变)
    document.querySelectorAll('.completeOrderBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const orders = getDataByType('order');
            const o = orders.find(i => i.id === btn.dataset.id);
            if (o) showConfirmModal(config, "确认发货/完成订单？", async () => updateRecord(o, { status: 'completed' }));
        });
    });

    document.querySelectorAll('.cancelOrderBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const orders = getDataByType('order');
            const o = orders.find(i => i.id === btn.dataset.id);
            if (o) showConfirmModal(config, "确定取消这个订单吗？", async () => updateRecord(o, { status: 'cancelled' }));
        });
    });

    // === 评价按钮监听 (新增) ===
    document.querySelectorAll('.rateBookingBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bookings = getDataByType('booking'); // 重新获取最新数据
            const booking = bookings.find(b => b.id === btn.dataset.id);
            if (booking) {
                showRatingModal(config, booking);
            }
        });
    });

    // === 6. Logo 上传事件 (已升级：Logo 圆形，QR 方形) ===
    document.getElementById('logoLoginInput')?.addEventListener('change', function(e) {
        // 👇 最后一个参数 true 代表圆形
        handleFileWithCrop(e.target.files[0], 'logoLoginUrl', 'loginLogoPreviewImg', 'loginLogoPlaceholder', true);
    });

    document.getElementById('logoHeaderInput')?.addEventListener('change', function(e) {
        // 👇 最后一个参数 true 代表圆形
        handleFileWithCrop(e.target.files[0], 'logoHeaderUrl', 'headerLogoPreviewImg', 'headerLogoPlaceholder', true);
    });

    document.getElementById('tngQrInput')?.addEventListener('change', function(e) {
        // 👇 ⚠️ 二维码必须是方形 (false)，切圆了会扫不到
        handleFileWithCrop(e.target.files[0], 'tngQrUrl', 'tngQrPreview', 'tngQrPlaceholder', false);
    });

    // === 7. 设置保存 ===
    document.getElementById('discountSettingsForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 获取提交按钮来显示“保存中...”
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "💾 保存中...";
        
        try {
            // 1. 保存管理员账号
            const newAdminUser = document.getElementById('adminUsername').value.trim();
            const newAdminPass = document.getElementById('adminPassword').value.trim();
            
            // ... (管理员账号保存逻辑保持不变) ...
            let rawData = JSON.parse(localStorage.getItem('gembrow_data') || '[]');
            rawData = rawData.filter(item => item.type !== 'owner_credentials');
            rawData.push({ 
                id: Date.now().toString(), 
                type: 'owner_credentials', 
                username: newAdminUser, 
                password: newAdminPass,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('gembrow_data', JSON.stringify(rawData));
            ownerCredentials = { username: newAdminUser, password: newAdminPass };

            // 2. 保存普通设置
            const currentSettings = getDataByType('discount_settings')[0] || {};
            const newSettings = {
                custom_terms: document.getElementById('customTerms').value,
                custom_privacy: document.getElementById('customPrivacy').value,
                custom_return: document.getElementById('customReturn').value,
                type: 'discount_settings',
                shop_name: document.getElementById('shopName').value.trim(),
                ssm_number: document.getElementById('ssmNumber').value.trim(),
                shop_address: document.getElementById('shopAddress').value.trim(),
                wa_number: document.getElementById('waNumber').value,
                
                // 👇👇👇 关键：确保这行存在，才能保存 TNG 图片 👇👇👇
                tng_qr_url: document.getElementById('tngQrUrl').value, 
                
                logo_login: document.getElementById('logoLoginUrl').value || '',
                logo_header: document.getElementById('logoHeaderUrl').value || '',
                map_link: document.getElementById('mapLink').value.trim(),
                fb_link: document.getElementById('fbLink').value.trim(),
                ig_link: document.getElementById('igLink').value.trim(),
                tiktok_link: document.getElementById('tiktokLink').value.trim(),
                enable_rewards: document.getElementById('enableRewards').checked,
                enable_shop: document.getElementById('enableShop').checked,
                enable_sst: document.getElementById('enableSST').checked,
                sst_rate: parseInt(document.getElementById('sstRate').value) || 6,
                sst_id: document.getElementById('sstID').value.trim(),
                show_sst_on_receipt: document.getElementById('showSSTOnReceipt').checked,
                bronze_points: parseInt(document.getElementById('bronzePoints').value) || 0,
                bronze_discount: parseInt(document.getElementById('bronzeDiscount').value) || 0,
                silver_points: parseInt(document.getElementById('silverPoints').value) || 100,
                silver_discount: parseInt(document.getElementById('silverDiscount').value) || 5,
                gold_points: parseInt(document.getElementById('goldPoints').value) || 300,
                gold_discount: parseInt(document.getElementById('goldDiscount').value) || 10,
                platinum_points: parseInt(document.getElementById('platinumPoints').value) || 600,
                platinum_discount: parseInt(document.getElementById('platinumDiscount').value) || 15,
                points_to_rm_rate: parseInt(document.getElementById('pointsToRmRate').value) || 10
            };
            
            if (currentSettings.id) {
                await updateRecord(currentSettings, newSettings);
            } else {
                await createRecord(newSettings);
            }

            showToast('✅ 设置已保存！');
            allData = loadDb();
            renderApp();
            if (typeof initGlobalWidgets === 'function') initGlobalWidgets();
            
        } catch (error) {
            showToast('❌ 保存失败：' + error.message);
            console.error(error);
        } finally {
            submitBtn.innerText = originalText;
        }
    });

    // === 8. 顾客功能 ===
    document.querySelectorAll('.bookServiceBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!loggedInCustomerName) {
                showToast('请先登录后预约');
                return;
            }
            showBookingModal(config, btn.dataset.serviceId, btn.dataset.serviceName, parseFloat(btn.dataset.servicePrice));
        });
    });

    document.querySelectorAll('.addToCartBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(typeof addToCart === 'function') addToCart(btn.dataset.id);
        });
    });

    document.getElementById('cartFab')?.addEventListener('click', () => {
        if(typeof showCartModal === 'function') showCartModal(config);
    });
    
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const products = getDataByType('product');
            const p = products.find(i => i.id === card.dataset.id);
            if (p && typeof showProductDetailModal === 'function') showProductDetailModal(config, p);
        });
    });
    
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderApp();
    });

    // 编辑个人资料
    document.getElementById('editProfileBtn')?.addEventListener('click', () => {
        console.log('Edit profile button clicked');
        const customer = getDataByType('customer_account').find(acc => acc.username === loggedInCustomerName);
        console.log('Customer found:', customer);
        if (customer) {
            showEditProfileModal(config, customer);
        }
    });

    // === 11. 底部条款监听 (新增) ===
    document.querySelectorAll('.footer-policy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showPolicyModal(config, btn.dataset.type);
        });
    });
}

// ==========================================
// 👇 添加客户弹窗 (已加入电话号码字段)
// ==========================================
function showAddCustomerModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h3 class="mb-6 text-xl font-bold" style="color: ${config.primary_action_color};">
                添加新客户
            </h3>
            
            <form id="addCustomerForm">
                <div class="mb-4">
                    <label class="block mb-2 font-bold text-sm text-gray-600">用户名</label>
                    <input type="text" id="newCustomerUsername" required placeholder="Amy"
                        class="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-pink-500">
                </div>

                <div class="mb-4">
                    <label class="block mb-2 font-bold text-sm text-gray-600">电话号码</label>
                    <input type="tel" id="newCustomerPhone" required placeholder="0123456789"
                        onchange="this.value = cleanPhoneNumber(this.value)"
                        class="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-green-500 bg-green-50">
                </div>
                
                <div class="mb-4">
                    <label class="block mb-2 font-bold text-sm text-gray-600">邮箱</label>
                    <input type="email" id="newCustomerEmail" required placeholder="amy@example.com"
                        class="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-pink-500">
                </div>
                
                <div class="mb-4">
                    <label class="block mb-2 font-bold text-sm text-gray-600">初始密码</label>
                    <input type="password" id="newCustomerPassword" required value="123456"
                        class="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-pink-500">
                </div>
                
                <div class="mb-6">
                    <label class="block mb-2 font-bold text-sm text-gray-600">初始积分</label>
                    <input type="number" id="newCustomerPoints" value="0" min="0"
                        class="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-pink-500">
                </div>
                
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 py-3 rounded-lg font-bold text-white shadow-md"
                        style="background: ${config.primary_action_color};">
                        确认添加
                    </button>
                    <button type="button" id="cancelAddCustomerBtn" class="flex-1 py-3 rounded-lg font-bold border-2 text-gray-500">
                        取消
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('addCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('newCustomerUsername').value;
        const email = document.getElementById('newCustomerEmail').value;
        const password = document.getElementById('newCustomerPassword').value;
        const phone = document.getElementById('newCustomerPhone').value; // 获取电话
        const points = parseInt(document.getElementById('newCustomerPoints').value);

        // 检查用户名是否存在
        const existingCustomer = getDataByType('customer_account').find(c => c.username === username);
        if (existingCustomer) {
            showToast('用户名已存在');
            return;
        }

        const success = await createRecord({
            type: 'customer_account',
            username: username,
            email: email,
            phone: cleanPhoneNumber(phone), // 保存前清洗号码
            password: password,
            points: points,
            membershipLevel: calculateMembershipLevel(points),
            lifetime_points: points // 初始历史积分等于当前积分
        });

        if (success) {
            showToast('✅ 客户添加成功');
            modal.remove();
        }
    });

    document.getElementById('cancelAddCustomerBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function showServiceModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;">
            <h3 class="mb-6" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                添加新服务
            </h3>
            
            <form id="serviceForm">
                <div class="mb-4">
                    <label for="serviceName" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                        服务名称
                    </label>
                    <input type="text" id="serviceName" required
                        class="w-full px-4 py-3 rounded-lg border-2"
                        style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                </div>
                
                <div class="mb-4">
                    <label for="servicePrice" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                        价格 (RM)
                    </label>
                    <input type="number" id="servicePrice" required min="0" step="0.01"
                        class="w-full px-4 py-3 rounded-lg border-2"
                        style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                </div>
                
                <div class="mb-4">
                    <label for="serviceDuration" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                        时长 (分钟)
                    </label>
                    <input type="number" id="serviceDuration" min="0" placeholder="可选"
                        class="w-full px-4 py-3 rounded-lg border-2"
                        style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                </div>

                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                        服务图片
                    </label>
                    
                    <input type="file" id="fileInput" accept="image/*" style="display: none;">
                    
                    <div id="dropZone" style="border: 2px dashed ${config.primary_action_color}; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s; background: ${config.primary_action_color}11;">
                        <p id="uploadText" style="color: ${config.text_color}; opacity: 0.7; pointer-events: none;">
                            📸 点击上传 / 拖拽图片<br>
                            <span style="font-size: 12px;">(或在下方直接粘贴链接)</span>
                        </p>
                        <img id="imagePreview" src="" style="max-height: 150px; display: none; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    </div>

                    <input type="text" id="serviceImage" placeholder="粘贴 IG 图片链接 或 ./assets/xxx.png"
                        class="w-full px-4 py-2 mt-2 rounded-lg border-2 text-sm"
                        style="font-family: Lato, sans-serif; border-color: ${config.text_color}33; color: ${config.text_color};">
                </div>
                
                <div class="mb-6">
                    <label for="serviceDescription" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                        描述
                    </label>
                    <textarea id="serviceDescription" required rows="3"
                        class="w-full px-4 py-3 rounded-lg border-2"
                        style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;"></textarea>
                </div>
                
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                        style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                        添加服务
                    </button>
                    <button type="button" id="cancelServiceBtn" class="flex-1 py-3 rounded-lg"
                        style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">
                        取消
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 图片处理逻辑
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const serviceImageInput = document.getElementById('serviceImage');
    const imagePreview = document.getElementById('imagePreview');
    const uploadText = document.getElementById('uploadText');

    // 监听手动输入链接，实时预览
    serviceImageInput.addEventListener('input', () => {
        const url = serviceImageInput.value;
        if (url) {
            imagePreview.src = url;
            imagePreview.style.display = 'block';
            uploadText.style.display = 'none';
        } else {
            imagePreview.style.display = 'none';
            uploadText.style.display = 'block';
        }
    });

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            openCropperModal(file, (base64) => {
                // imageInput 是你在各函数里定义的输入框变量名
                // imagePreview 是预览图变量名
                if (typeof imageInput !== 'undefined') imageInput.value = base64;
                if (typeof updatePreview === 'function') {
                    updatePreview(base64); 
                } else if (typeof imagePreview !== 'undefined') {
                    // 兼容旧逻辑
                    imagePreview.src = base64;
                    imagePreview.style.display = 'block';
                    if(typeof uploadText !== 'undefined') uploadText.style.display = 'none';
                }
            });
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.background = `${config.primary_action_color}33`;
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.background = `${config.primary_action_color}11`;
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.background = `${config.primary_action_color}11`;
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    async function handleFile(file) { // 👈 加 async
        if (!file) return;
        try {
            showToast('图片处理中...');
            // 👇 服务图可以稍微大一点，最大宽 800px
            const compressedBase64 = await compressImage(file, 800, 0.7);
            
            serviceImageInput.value = compressedBase64;
            imagePreview.src = compressedBase64;
            imagePreview.style.display = 'block';
            uploadText.style.display = 'none';
        } catch (err) {
            showToast('❌ 图片过大或格式不支持');
        }
    }

    document.getElementById('serviceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const success = await createRecord({
            type: 'service',
            name: document.getElementById('serviceName').value,
            price: parseFloat(document.getElementById('servicePrice').value),
            duration: document.getElementById('serviceDuration').value ? parseInt(document.getElementById('serviceDuration').value) : 0,
            description: document.getElementById('serviceDescription').value,
            imageUrl: document.getElementById('serviceImage').value
        });
        
        if (success) {
            modal.remove();
        }
    });
    
    document.getElementById('cancelServiceBtn').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function showPostModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
                <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <h3 class="mb-6" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                        发布新动态
                    </h3>
                    
                    <form id="postForm">
                        <div class="mb-4">
                            <label for="postTitle" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                标题
                            </label>
                            <input type="text" id="postTitle" required
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-6">
                            <label for="postContent" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                内容
                            </label>
                            <textarea id="postContent" required rows="4"
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;"></textarea>
                        </div>
                        
                        <div class="flex gap-3">
                            <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                发布动态
                            </button>
                            <button type="button" id="cancelPostBtn" class="flex-1 py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">
                                取消
                            </button>
                        </div>
                    </form>
                </div>
            `;

    document.body.appendChild(modal);

    document.getElementById('postForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const success = await createRecord({
            type: 'post',
            postTitle: document.getElementById('postTitle').value,
            postContent: document.getElementById('postContent').value,
            postImageUrl: ''
        });

        if (success) {
            modal.remove();
        }
    });

    document.getElementById('cancelPostBtn').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}
// ==========================================
// 👇 预约弹窗
// ==========================================
function showBookingModal(config, serviceId, serviceName, servicePrice) {
    const customerAccount = loggedInCustomerName ?
        getDataByType('customer_account').find(acc => acc.username === loggedInCustomerName) : null;
    const prefillPhone = customerAccount ? (customerAccount.phone || '') : '';
    const availablePoints = customerAccount ? customerAccount.points : 0;
    const settings = getDiscountSettings();
    const pointsToRmRate = settings.points_to_rm_rate || 10;
    const showRewards = settings.enable_rewards !== false;

    // 获取服务详情
    const service = getDataByType('service').find(s => s.id === serviceId);
    const duration = service ? (service.duration || 60) : 60; 

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 85vh; overflow-y: auto;">
            <h3 class="mb-2 text-center" style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.primary_action_color};">
                预约 ${serviceName}
            </h3>
            <p class="text-center text-xs text-gray-400 mb-6">预计时长: ${duration} 分钟</p>
        
            <form id="bookingForm">
                <div class="mb-4">
                    <label class="block mb-1 font-bold text-sm">姓名</label>
                    <input type="text" id="customerName" required value="${loggedInCustomerName || ''}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                </div>
            
                <div class="mb-4">
                    <label class="block mb-1 font-bold text-sm">电话</label>
                    <input type="tel" id="customerPhone" required value="${prefillPhone}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                </div>
            
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block mb-1 font-bold text-sm">日期</label>
                        <input type="date" id="appointmentDate" required min="${new Date().toISOString().split('T')[0]}"
                            class="w-full px-3 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                    </div>
                    <div>
                        <label class="block mb-1 font-bold text-sm">时间</label>
                        <input type="time" id="appointmentTime" required
                            class="w-full px-3 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                    </div>
                </div>
            
                ${customerAccount && showRewards ? `
                    <div class="mb-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div class="flex justify-between items-center mb-2">
                            <label class="font-bold text-sm">使用积分 (可用: ${availablePoints})</label>
                            <button type="button" id="useMaxPointsBtn" 
                                style="background: ${config.secondary_action_color}; color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 12px;">
                                最大
                            </button>
                        </div>
                        <input type="number" id="pointsToUse" value="0" min="0" max="${availablePoints}"
                            class="w-full px-4 py-2 rounded-lg border-2 mb-2" style="border-color: ${config.text_color}33;">
                        <p class="text-xs opacity-60 text-right">10积分 = RM1</p>
                    </div>
                    <div class="mb-6 p-4 rounded-xl" style="background: ${config.secondary_action_color}11;">
                        <div class="flex justify-between text-sm mb-1"><span>原价:</span><span>RM${servicePrice}</span></div>
                        <div class="flex justify-between text-sm mb-2 text-pink-500"><span>积分抵扣:</span><span id="pointsDiscount">-RM0.00</span></div>
                        <div class="flex justify-between font-bold border-t border-gray-300 pt-2">
                            <span>最终价格:</span>
                            <span id="finalPrice" style="color: ${config.primary_action_color};">RM${servicePrice}</span>
                        </div>
                    </div>
                ` : `<div class="mb-6"></div>`}
            
                <div class="flex gap-3 pt-2">
                    <button type="submit" class="flex-1 btn-primary py-3 rounded-lg font-bold text-white shadow-md"
                        style="background: ${config.primary_action_color};">
                        确认预约
                    </button>
                    <button type="button" id="cancelBookingBtn" class="flex-1 py-3 rounded-lg border-2 font-bold"
                        style="border-color: ${config.text_color}; color: ${config.text_color}; background: transparent;">
                        取消
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // 积分逻辑
    const pointsInput = document.getElementById('pointsToUse');
    if (pointsInput) {
        pointsInput.addEventListener('input', () => {
            const pointsUsed = parseInt(pointsInput.value) || 0;
            const pointsDiscount = (pointsUsed / pointsToRmRate).toFixed(2);
            const finalPrice = Math.max(0, parseFloat(servicePrice) - parseFloat(pointsDiscount)).toFixed(2);
            document.getElementById('pointsDiscount').textContent = `-RM${pointsDiscount}`;
            document.getElementById('finalPrice').textContent = `RM${finalPrice}`;
        });
        document.getElementById('useMaxPointsBtn').addEventListener('click', () => {
            const maxPointsByPrice = Math.floor(parseFloat(servicePrice) * pointsToRmRate);
            const maxPoints = Math.min(availablePoints, maxPointsByPrice);
            pointsInput.value = maxPoints;
            pointsInput.dispatchEvent(new Event('input'));
        });
    }

    // 提交逻辑
    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. 先获取基础信息
        const finalName = document.getElementById('customerName').value;
        const targetDate = document.getElementById('appointmentDate').value;
        const targetTime = document.getElementById('appointmentTime').value;
        
        // --- 防撞车检测 (保持你原有的逻辑，不要删) ---
        const [h, m] = targetTime.split(':').map(Number);
        const newStart = h * 60 + m;
        const newEnd = newStart + duration;
        const existingBookings = getDataByType('booking').filter(b => 
            b.appointmentDate === targetDate && b.status !== 'cancelled'
        );
        let hasConflict = false;
        for (let b of existingBookings) {
            const [bh, bm] = b.appointmentTime.split(':').map(Number);
            const existStart = bh * 60 + bm;
            const existDuration = b.duration || 60; 
            const existEnd = existStart + existDuration;
            if (newStart < existEnd && newEnd > existStart) {
                hasConflict = true;
                break;
            }
        }
        if (hasConflict) {
            showToast('❌ 该时段忙碌或休息中，请换个时间');
            return;
        }
        // ------------------------------------------

        // 👇👇👇【重点】你刚才漏掉的就是这一段！👇👇👇
        // 必须先算出 finalPriceNum，下面的 createRecord 才能用它
        const pointsUsed = (customerAccount && showRewards) ? (parseInt(document.getElementById('pointsToUse')?.value) || 0) : 0;
        const basePrice = parseFloat(servicePrice); // 确保是数字
        const discountAmount = pointsUsed / pointsToRmRate;
        
        // 这就是 finalPriceNum 的出生地：
        const finalPriceNum = Math.max(0, basePrice - discountAmount);
        // 👆👆👆【重点结束】👆👆👆

        // 生成流水单号
        const newReceiptNo = generateReceiptNumber(); 

        const success = await createRecord({
            type: 'booking',
            receiptNumber: newReceiptNo,
            customerName: finalName,
            customerPhone: document.getElementById('customerPhone').value,
            serviceId: serviceId,
            serviceName: serviceName,
            appointmentDate: targetDate,
            appointmentTime: targetTime,
            duration: duration,
            status: 'pending',
            
            // 现在这里就不会报错了，因为上面已经定义了 finalPriceNum
            totalAmount: parseFloat(finalPriceNum.toFixed(2)), 
            points_used: pointsUsed
        });

        if (success) {
            if (customerAccount && pointsUsed > 0) {
                await updateRecord(customerAccount, { points: customerAccount.points - pointsUsed });
            }
            
            modal.remove(); 

            // 呼叫粉色门票
            const newBooking = {
                id: Date.now().toString(),
                receiptNumber: newReceiptNo,
                serviceName: serviceName,
                appointmentDate: targetDate,
                appointmentTime: targetTime,
                customerName: finalName
            };
            
            if (typeof showTicketModal === 'function') {
                showTicketModal(config, newBooking); 
            }
        }
    });

    document.getElementById('cancelBookingBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// === 评价弹窗 ===
function showRatingModal(config, booking) {
    // 1. 【核心修复】强制重新获取一次最新数据，防止缓存导致能重复评价
    const allRatings = getDataByType('rating'); // 这里的 getDataByType 会读取最新的全局变量
    const hasRated = allRatings.some(r => r.bookingId === booking.id);
    
    if (hasRated) {
        showToast('您已经评价过这次服务了，谢谢！');
        // 强制刷新一下页面，把那个按钮藏起来
        renderApp(); 
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 400px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center;">
            <h3 class="mb-2" style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.primary_action_color};">
                服务评价
            </h3>
            <p class="mb-6 opacity-70 text-sm">为 ${booking.serviceName} 打个分吧</p>
            
            <div class="flex justify-center gap-2 mb-6" id="starContainer">
                ${[1, 2, 3, 4, 5].map(i => `
                    <span class="star-btn cursor-pointer transition-transform hover:scale-110" data-value="${i}" style="font-size: 40px; color: #e5e7eb; transition: color 0.2s;">★</span>
                `).join('')}
            </div>
            
            <div class="mb-6 text-left">
                <label class="block mb-2 text-sm font-bold text-gray-600">写点评语 (可选)</label>
                <textarea id="ratingComment" rows="3" placeholder="技术怎么样？环境舒服吗？..." 
                    class="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-pink-400" 
                    style="border-color: ${config.text_color}33; resize: none;"></textarea>
            </div>
            
            <div class="flex gap-3">
                <button id="submitRatingBtn" class="flex-1 btn-primary py-3 rounded-lg font-bold shadow-md"
                    style="background: ${config.primary_action_color}; color: #ffffff;">提交评价</button>
                <button id="cancelRatingBtn" class="flex-1 py-3 rounded-lg font-bold"
                    style="border: 2px solid ${config.text_color}; background: transparent;">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 星星交互逻辑
    let currentRating = 0;
    const stars = modal.querySelectorAll('.star-btn');
    
    stars.forEach(star => {
        // 鼠标移入预览
        star.addEventListener('mouseenter', () => {
            const val = parseInt(star.dataset.value);
            stars.forEach((s, i) => {
                s.style.color = i < val ? '#fbbf24' : '#e5e7eb'; // 金色 vs 灰色
            });
        });
        
        // 鼠标移出恢复 (如果没有点击确认，就恢复原样)
        star.addEventListener('mouseleave', () => {
            stars.forEach((s, i) => {
                s.style.color = i < currentRating ? '#fbbf24' : '#e5e7eb';
            });
        });
        
        // 点击确认
        star.addEventListener('click', () => {
            currentRating = parseInt(star.dataset.value);
            // 点击后加个小动画
            star.style.transform = 'scale(1.4)';
            setTimeout(() => star.style.transform = 'scale(1)', 200);
            
            stars.forEach((s, i) => {
                s.style.color = i < currentRating ? '#fbbf24' : '#e5e7eb';
            });
        });
    });

    // 提交逻辑
    document.getElementById('submitRatingBtn').addEventListener('click', async () => {
        if (currentRating === 0) {
            showToast('请先点击星星打分哦！⭐');
            return;
        }
        
        const comment = document.getElementById('ratingComment').value; // 获取评语
        
        const success = await createRecord({
            type: 'rating',
            serviceId: booking.serviceId,
            bookingId: booking.id, // 关键：绑定订单ID，防止重复
            customerName: booking.customerName,
            rating: currentRating,
            comment: comment,
            createdAt: new Date().toISOString()
        });
        
        if (success) {
            showToast('评价成功！感谢您的支持 🌹');
            modal.remove();
            // 强制刷新页面，让“去评价”按钮消失，并更新首页分数
            setTimeout(() => {
                renderApp();
            }, 500); // 稍微等半秒让数据存好
        }
    });
    
    document.getElementById('cancelRatingBtn').addEventListener('click', () => modal.remove());
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ==========================================
// 👇 编辑客户弹窗 (允许老板重置顾客密码)
// ==========================================
function showEditCustomerModal(config, customer) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    const currentLevel = customer.membershipLevel || 'bronze';

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border-2" style="border-color: ${config.primary_action_color};">
            <div class="p-6 text-center text-white" style="background: ${config.primary_action_color};">
                <h3 class="text-xl font-bold">编辑客户资料</h3>
                <p class="text-sm opacity-80">${customer.username}</p>
            </div>
            
            <form id="editCustomerForm" class="p-6">
                
                <div class="mb-4">
                    <label class="block mb-1 font-bold text-sm text-gray-600">电话号码</label>
                    <input type="tel" id="editPhone" value="${customer.phone || ''}" 
                        onchange="this.value = cleanPhoneNumber(this.value)"
                        class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:border-green-500 bg-green-50">
                </div>
                <div class="mb-4">
                    <label class="block mb-1 font-bold text-sm text-gray-600">电子邮箱</label>
                    <input type="email" id="editEmail" value="${customer.email || ''}" 
                        class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:border-pink-500">
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block mb-1 font-bold text-sm text-gray-600">当前积分</label>
                        <input type="number" id="editPoints" value="${customer.points}" 
                            class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:border-pink-500">
                    </div>
                    <div>
                        <label class="block mb-1 font-bold text-sm text-gray-600">会员等级</label>
                        <select id="editMembership" class="w-full px-4 py-2 rounded-lg border focus:outline-none focus:border-pink-500">
                            <option value="bronze" ${currentLevel === 'bronze' ? 'selected' : ''}>🥉 铜牌会员</option>
                            <option value="silver" ${currentLevel === 'silver' ? 'selected' : ''}>🥈 银牌会员</option>
                            <option value="gold" ${currentLevel === 'gold' ? 'selected' : ''}>🥇 金牌会员</option>
                            <option value="platinum" ${currentLevel === 'platinum' ? 'selected' : ''}>💎 白金会员</option>
                        </select>
                    </div>
                </div>

                <div class="mb-6 p-4 bg-red-50 rounded-xl border border-red-100">
                    <label class="block mb-2 font-bold text-sm text-red-600 flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        重置客户密码
                    </label>
                    <input type="text" id="resetPassword" placeholder="输入新密码 (留空则不修改)" 
                        class="w-full px-4 py-2 rounded-lg border border-red-200 focus:outline-none focus:border-red-500 bg-white text-red-600 font-bold placeholder-red-200">
                    <p class="text-xs text-red-400 mt-1">⚠️ 此操作会修改该客户的登录密码。</p>
                </div>

                <div class="flex gap-3">
                    <button type="button" id="cancelEditBtn" class="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100">取消</button>
                    <button type="submit" class="flex-1 py-3 rounded-xl font-bold text-white shadow-md" style="background: ${config.primary_action_color};">保存修改</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('cancelEditBtn').addEventListener('click', () => modal.remove());
    
    document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updates = {
            phone: cleanPhoneNumber(document.getElementById('editPhone').value), // 保存电话
            email: document.getElementById('editEmail').value,
            points: parseInt(document.getElementById('editPoints').value),
            membershipLevel: document.getElementById('editMembership').value 
        };

        const newPass = document.getElementById('resetPassword').value;
        if(newPass && newPass.trim() !== '') {
            updates.password = newPass.trim();
            showToast(`🔑 密码已重置为: ${updates.password}`);
        } else {
            showToast('✅ 资料已更新');
        }

        await updateRecord(customer, updates);
        modal.remove();
        renderApp();
    });

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ==========================================
// 👇 编辑个人资料 (加入头像上传功能)
// ==========================================
function showEditProfileModal(config, customer) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/847/847969.png'; 
    
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h3 class="mb-6 text-center" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                编辑个人资料
            </h3>
            
            <form id="editProfileForm">
                <div class="mb-6 flex flex-col items-center">
                    <div class="relative group cursor-pointer" id="avatarDropZone">
                        <div class="w-24 h-24 rounded-full overflow-hidden border-4 shadow-md bg-gray-100" style="border-color: ${config.primary_action_color};">
                            <img id="avatarPreview" src="${customer.avatarUrl || defaultAvatar}" class="w-full h-full object-cover">
                        </div>
                        <div class="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span class="text-white text-xs font-bold">更换</span>
                        </div>
                    </div>
                    <input type="file" id="avatarFileInput" accept="image/*" style="display: none;">
                    <input type="hidden" id="avatarBase64" value="${customer.avatarUrl || ''}">
                    <p class="text-xs text-gray-400 mt-2">点击头像上传 (建议正方形)</p>
                </div>

                <div class="mb-4">
                    <label class="block mb-2 font-bold text-gray-700">用户名</label>
                    <input type="text" id="editProfileUsername" required value="${customer.username}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                </div>

                <div class="mb-4">
                    <label class="block mb-2 font-bold text-gray-700">电话号码</label>
                    <input type="tel" id="editProfilePhone" required value="${customer.phone || ''}"
                        onchange="this.value = cleanPhoneNumber(this.value)"
                        class="w-full px-4 py-3 rounded-lg border-2 bg-green-50 focus:border-green-500" style="border-color: ${config.text_color}33;">
                </div>
                <div class="mb-4">
                    <label class="block mb-2 font-bold text-gray-700">邮箱</label>
                    <input type="email" id="editProfileEmail" required value="${customer.email}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                </div>
                
                <div class="mb-6">
                    <label class="block mb-2 font-bold text-gray-700">新密码 (留空保持不变)</label>
                    <input type="password" id="editProfilePassword" placeholder="••••••"
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                </div>
                
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 btn-primary py-3 rounded-lg text-white font-bold"
                        style="background: ${config.primary_action_color};">保存修改</button>
                    <button type="button" id="cancelEditProfileBtn" class="flex-1 py-3 rounded-lg font-bold"
                        style="background: transparent; color: ${config.text_color}; border: 2px solid ${config.text_color};">取消</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // 图片上传逻辑
    const dropZone = document.getElementById('avatarDropZone');
    const fileInput = document.getElementById('avatarFileInput');
    const preview = document.getElementById('avatarPreview');
    const hiddenInput = document.getElementById('avatarBase64');

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // 👇 这里的 true 代表开启圆形裁剪
            openCropperModal(file, (base64) => {
                preview.src = base64;
                hiddenInput.value = base64; 
            }, true); 
        }
    });

    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const newUsername = document.getElementById('editProfileUsername').value.trim();
        const newPhone = document.getElementById('editProfilePhone').value.trim(); // 获取电话
        const newEmail = document.getElementById('editProfileEmail').value.trim();
        const newPassword = document.getElementById('editProfilePassword').value;
        const newAvatar = document.getElementById('avatarBase64').value;

        if (!newUsername || !newEmail) {
            showToast('用户名和邮箱不能为空');
            return;
        }

        if (newUsername !== customer.username) {
            const existing = getDataByType('customer_account').find(acc => acc.username === newUsername);
            if (existing) {
                showToast('用户名已存在');
                return;
            }
        }

        const updates = {
            username: newUsername,
            phone: cleanPhoneNumber(newPhone), // 保存电话
            email: newEmail,
            avatarUrl: newAvatar
        };

        if (newPassword && newPassword.length >= 4) {
            updates.password = newPassword;
        }

        await updateRecord(customer, updates);

        if (newUsername !== customer.username) {
            loggedInCustomerName = newUsername;
        }

        modal.remove();
        renderApp();
        showToast('个人资料已更新');
    });

    document.getElementById('cancelEditProfileBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function showConfirmModal(config, message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
                <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 400px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <p class="mb-6" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 1.1}px; color: ${config.text_color}; text-align: center;">
                        ${message}
                    </p>
                    
                    <div class="flex gap-3">
                        <button id="confirmBtn" class="flex-1 py-3 rounded-lg"
                            style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                            确定
                        </button>
                        <button id="cancelConfirmBtn" class="flex-1 py-3 rounded-lg"
                            style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">
                            取消
                        </button>
                    </div>
                </div>
            `;

    document.body.appendChild(modal);

    document.getElementById('confirmBtn').addEventListener('click', async () => {
        await onConfirm();
        modal.remove();
    });

    document.getElementById('cancelConfirmBtn').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// === 确认完成订单弹窗 (新增：可选实际日期) ===
function showCompleteBookingModal(config, booking) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    // 默认时间设为当前时间
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5); // HH:mm

    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 400px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h3 class="mb-4 text-center" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.primary_action_color};">
                ✅ 确认完成服务
            </h3>
            <p class="mb-6 text-center text-sm opacity-70">请确认实际完成服务的日期和时间，<br>这将用于统计数据。</p>
            
            <form id="completeBookingForm">
                <div class="mb-4">
                    <label class="block mb-2 font-bold text-sm">实际完成日期</label>
                    <input type="date" id="actualDate" required value="${todayStr}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                </div>
                
                <div class="mb-6">
                    <label class="block mb-2 font-bold text-sm">实际完成时间</label>
                    <input type="time" id="actualTime" required value="${timeStr}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                </div>
                
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 btn-primary py-3 rounded-lg font-bold"
                        style="background: #10b981; color: #ffffff;">确认完成</button>
                    <button type="button" id="cancelCompleteBtn" class="flex-1 py-3 rounded-lg font-bold"
                        style="border: 2px solid ${config.text_color}; background: transparent;">取消</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('completeBookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('actualDate').value;
        const time = document.getElementById('actualTime').value;
        
        // 组合成完整的 ISO 时间字符串
        const completedAt = new Date(`${date}T${time}`).toISOString();
        
        await updateRecord(booking, { 
            status: 'completed', 
            completedAt: completedAt // 保存实际完成时间！
        });
        
        modal.remove();
    });
    
    document.getElementById('cancelCompleteBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ==========================================
// 👇 [v1.3.2] 条款弹窗 (支持自定义内容)
// ==========================================
function showPolicyModal(config, type) {
    // 1. 获取老板设置
    const settings = getDiscountSettings();

    // 2. 定义默认文案 (Default Content)
    const defaultTexts = {
        terms: `
            <div class="space-y-4 text-left text-sm">
                <div class="p-3 bg-red-50 rounded-lg border border-red-100">
                    <h4 class="font-bold text-red-600 mb-1">⚠️ 重要免责声明 (Disclaimer)</h4>
                    <ul class="list-disc pl-4 space-y-1 text-gray-700">
                        <li><strong>过敏反应：</strong>美睫胶水/纹绣色料可能引起极少数人的过敏反应。敏感体质请务必提前告知并要求测试。</li>
                        <li><strong>健康告知：</strong>若患有眼疾、刚做手术、孕期或生理期，请提前告知。隐瞒健康状况导致的后果由客人承担。</li>
                    </ul>
                </div>
                <div><h4 class="font-bold text-gray-800 mb-1">1. 迟到与取消</h4><p class="text-gray-600">迟到超过 15 分钟我们将有权取消预约，定金不予退还。</p></div>
                <div><h4 class="font-bold text-gray-800 mb-1">2. 审美差异</h4><p class="text-gray-600">手工艺术无法做到 100% 绝对对称，图片仅供参考。</p></div>
            </div>`,
        privacy: `
            <div class="space-y-4 text-left text-sm text-gray-600">
                <p>我们非常重视您的隐私安全。</p>
                <ul class="list-disc pl-4 space-y-2">
                    <li><strong>资料用途：</strong>仅用于预约联系和会员档案。</li>
                    <li><strong>照片使用：</strong>服务前后拍摄的照片仅用于作品展示，如介意请告知。</li>
                    <li><strong>绝不外泄：</strong>资料绝不出售给第三方。</li>
                </ul>
            </div>`,
        return_policy: `
            <div class="space-y-4 text-left text-sm">
                <div><h4 class="font-bold text-gray-800 mb-1">💅 服务售后</h4><p class="text-red-500 font-bold mb-2">服务离店后恕不退款。</p><p class="text-gray-600">如对效果不满意请当场提出。接睫毛 3 天内非人为大量脱落可免费修补。</p></div>
                <div class="border-t pt-4"><h4 class="font-bold text-gray-800 mb-1">💸 定金退还</h4><p class="text-gray-600">更改时间请提前 24 小时通知，否则定金不退。</p></div>
            </div>`
    };

    // 3. 智能判断：有自定义用自定义，没有用默认
    // (把换行符 \n 换成 <br> 以便在网页显示)
    const formatText = (text) => text ? `<div class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">${text}</div>` : null;

    const policies = {
        terms: {
            title: "Terms & Conditions (服务与免责条款)",
            content: formatText(settings.custom_terms) || defaultTexts.terms
        },
        privacy: {
            title: "Privacy Policy (隐私政策)",
            content: formatText(settings.custom_privacy) || defaultTexts.privacy
        },
        return_policy: {
            title: "Return & Refund (售后与退款政策)",
            content: formatText(settings.custom_return) || defaultTexts.return_policy
        }
    };

    const policy = policies[type];
    if (!policy) return;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div class="animate-fade-in-down" style="background: rgba(255, 255, 255, 0.98); padding: 0; border-radius: 16px; max-width: 600px; width: 100%; border-top: 6px solid ${config.primary_action_color}; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); max-height: 85vh; display: flex; flex-direction: column;">
            <div class="flex justify-between items-center p-6 border-b">
                <h3 style="font-size: ${config.font_size * 1.2}px; font-weight: 700; color: ${config.primary_action_color};">
                    ${policy.title}
                </h3>
                <button id="closePolicyBtn" class="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
            </div>
            <div class="p-6 overflow-y-auto" style="font-family: sans-serif; line-height: 1.6;">
                ${policy.content}
            </div>
            <div class="p-6 border-t bg-gray-50 rounded-b-xl text-center">
                <button id="okPolicyBtn" class="px-10 py-3 rounded-full shadow-lg transform active:scale-95 transition-all hover:shadow-xl" 
                    style="background: ${config.primary_action_color}; color: #ffffff; font-weight: bold; font-size: 14px;">
                    我已阅读并同意 (I Agree)
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const close = () => modal.remove();
    document.getElementById('closePolicyBtn').addEventListener('click', close);
    document.getElementById('okPolicyBtn').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

// Config change handler
async function onConfigChange(config) {
    renderApp();
}

// Initialize app
async function initApp() {
    // 👇👇👇 1. V1.2.0 新增：自动加载 Cropper.js (图片裁剪库) 👇👇👇
    if (!document.getElementById('cropper-css')) {
        const link = document.createElement('link');
        link.id = 'cropper-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
        document.head.appendChild(link);
    }
    if (!window.Cropper) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
        document.head.appendChild(script);
    }

    if (window.elementSdk) {
        await window.elementSdk.init({
            defaultConfig,
            onConfigChange,
            mapToCapabilities: (config) => ({
                recolorables: [
                    {
                        get: () => config.background_color || defaultConfig.background_color,
                        set: (value) => window.elementSdk.setConfig({ background_color: value })
                    },
                    {
                        get: () => config.primary_action_color || defaultConfig.primary_action_color,
                        set: (value) => window.elementSdk.setConfig({ primary_action_color: value })
                    }
                ],
                borderables: [],
                fontEditable: {
                    get: () => config.font_family || defaultConfig.font_family,
                    set: (value) => window.elementSdk.setConfig({ font_family: value })
                },
                fontSizeable: {
                    get: () => config.font_size || defaultConfig.font_size,
                    set: (value) => window.elementSdk.setConfig({ font_size: value })
                }
            }),
            mapToEditPanelValues: (config) => new Map([
                ['app_title', config.app_title || defaultConfig.app_title],
                ['posts_title', config.posts_title || defaultConfig.posts_title]
            ])
        });
    }

    const initResult = await window.dataSdk.init(dataHandler);
    if (!initResult.isOk) {
        console.error('Failed to initialize Data SDK');
    }
}

function showEditServiceModal(config, service) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;">
            <h3 class="mb-6" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                编辑服务: ${service.name}
            </h3>
            
            <form id="editServiceForm">
                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">服务名称</label>
                    <input type="text" id="editServiceName" required value="${service.name}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                </div>
                
                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">价格 (RM)</label>
                    <input type="number" id="editServicePrice" required min="0" step="0.01" value="${service.price}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                </div>
                
                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">时长 (分钟)</label>
                    <input type="number" id="editServiceDuration" min="0" value="${service.duration || 0}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                </div>

                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">服务图片</label>
                    <input type="file" id="editFileInput" accept="image/*" style="display: none;">
                    
                    <div id="editDropZone" style="border: 2px dashed ${config.primary_action_color}; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s; background: ${config.primary_action_color}11;">
                         <img id="editImagePreview" src="${service.imageUrl || ''}" style="max-height: 150px; margin: 0 auto; border-radius: 8px; display: ${service.imageUrl ? 'block' : 'none'};">
                        <p id="editUploadText" style="color: ${config.text_color}; opacity: 0.7; pointer-events: none; display: ${service.imageUrl ? 'none' : 'block'};">
                            📸 点击修改图片<br><span style="font-size: 12px;">(拖拽或粘贴链接)</span>
                        </p>
                    </div>

                    <input type="text" id="editServiceImage" placeholder="图片链接..." value="${service.imageUrl || ''}"
                        class="w-full px-4 py-2 mt-2 rounded-lg border-2 text-sm"
                        style="font-family: Lato, sans-serif; border-color: ${config.text_color}33; color: ${config.text_color};">
                </div>
                
                <div class="mb-6">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">描述</label>
                    <textarea id="editServiceDescription" required rows="3"
                        class="w-full px-4 py-3 rounded-lg border-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">${service.description}</textarea>
                </div>
                
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                        style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">保存更改</button>
                    <button type="button" id="cancelEditServiceBtn" class="flex-1 py-3 rounded-lg"
                        style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">取消</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 编辑逻辑：图片处理
    const dropZone = document.getElementById('editDropZone');
    const fileInput = document.getElementById('editFileInput');
    const imageInput = document.getElementById('editServiceImage');
    const preview = document.getElementById('editImagePreview');
    const text = document.getElementById('editUploadText');

    const updatePreview = (src) => {
        if (src) {
            preview.src = src;
            preview.style.display = 'block';
            text.style.display = 'none';
        } else {
            preview.style.display = 'none';
            text.style.display = 'block';
        }
    };

    imageInput.addEventListener('input', () => updatePreview(imageInput.value));
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            openCropperModal(file, (base64) => {
                imageInput.value = base64;
                updatePreview(base64);
            });
        }
    });

    // 提交更新
    document.getElementById('editServiceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateRecord(service, {
            name: document.getElementById('editServiceName').value,
            price: parseFloat(document.getElementById('editServicePrice').value),
            duration: parseInt(document.getElementById('editServiceDuration').value) || 0,
            description: document.getElementById('editServiceDescription').value,
            imageUrl: imageInput.value
        });
        modal.remove();
    });
    
    document.getElementById('cancelEditServiceBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

initApp();


// ==================== 商品管理功能 ====================

// ==========================================
// 👇 V1.2.X 优化：添加商品 (含库存输入)
// ==========================================
function showProductModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    // 默认图
    const placeholder = 'https://via.placeholder.com/150?text=Upload+Image';

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border-4" style="border-color: ${config.primary_action_color};">
            <div class="p-6">
                <h3 class="text-xl font-bold mb-6 text-center">✨ 上架新商品</h3>
                
                <div class="mb-6 flex justify-center">
                    <div class="relative group cursor-pointer w-32 h-32" id="prodImgContainer">
                        <img id="newProdPreview" src="${placeholder}" class="w-full h-full object-cover rounded-xl border-2 border-dashed border-gray-300">
                        <div class="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-xl">
                            <span class="text-white opacity-0 group-hover:opacity-100 font-bold text-sm">点击上传</span>
                        </div>
                        <input type="file" id="newProdFile" accept="image/*" class="hidden">
                        <input type="hidden" id="newProdImgBase64" value="">
                    </div>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">商品名称</label>
                        <input type="text" id="newProdName" class="w-full px-4 py-2 rounded-lg border focus:border-pink-500" placeholder="例如: 修复面膜">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">价格 (RM)</label>
                            <input type="number" id="newProdPrice" step="0.01" class="w-full px-4 py-2 rounded-lg border focus:border-pink-500" placeholder="0.00">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">初始库存</label>
                            <input type="number" id="newProdStock" value="10" min="0" class="w-full px-4 py-2 rounded-lg border bg-blue-50 focus:border-blue-500 font-bold text-blue-700">
                        </div>
                    </div>
                    
                    <div class="mb-2">
                        <label class="block text-xs font-bold text-gray-500 mb-1">商品描述</label>
                        <textarea id="newProdDesc" rows="2" class="w-full px-4 py-2 rounded-lg border focus:border-pink-500"></textarea>
                    </div>

                    <div class="flex gap-3 mt-6">
                        <button id="cancelAddProd" class="flex-1 py-3 rounded-xl font-bold text-gray-500 border border-gray-200">取消</button>
                        <button id="confirmAddProd" class="flex-1 py-3 rounded-xl font-bold text-white shadow-md" style="background: ${config.primary_action_color};">确认上架</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 图片上传 (支持裁剪)
    const fileInput = document.getElementById('newProdFile');
    const imageInput = document.getElementById('newProdImgBase64');
    const imagePreview = document.getElementById('newProdPreview');

    document.getElementById('prodImgContainer').addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // 商品图保持方形 (false)
            openCropperModal(file, (base64) => {
                imageInput.value = base64;
                imagePreview.src = base64;
            }, false);
        }
    });

    // 保存逻辑
    document.getElementById('confirmAddProd').addEventListener('click', async () => {
        const name = document.getElementById('newProdName').value;
        const price = parseFloat(document.getElementById('newProdPrice').value);
        const stock = parseInt(document.getElementById('newProdStock').value) || 0; // 获取库存
        const desc = document.getElementById('newProdDesc').value;
        const img = document.getElementById('newProdImgBase64').value;

        if (!name || isNaN(price)) return showToast('请填写完整信息');

        await createRecord({
            type: 'product',
            name,
            price,
            stock, // 保存库存
            description: desc,
            imageUrl: img,
            createdAt: new Date().toISOString()
        });

        showToast('✅ 商品上架成功');
        modal.remove();
        renderApp();
    });

    document.getElementById('cancelAddProd').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ==========================================
// 👇 V1.2.X 优化：编辑商品 (支持改库存/补货)
// ==========================================
function showEditProductModal(config, product) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border-4" style="border-color: ${config.primary_action_color};">
            <div class="p-6">
                <h3 class="text-xl font-bold mb-6 text-center">📝 编辑 / 补货</h3>
                
                <div class="mb-6 flex justify-center">
                    <div class="relative group cursor-pointer w-32 h-32" id="editProdImgContainer">
                        <img id="editProdPreview" src="${product.imageUrl || 'https://via.placeholder.com/150'}" class="w-full h-full object-cover rounded-xl border border-gray-200">
                        <div class="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-xl">
                            <span class="text-white opacity-0 group-hover:opacity-100 font-bold text-sm">更换图片</span>
                        </div>
                        <input type="file" id="editProdFile" accept="image/*" class="hidden">
                        <input type="hidden" id="editProdImgBase64" value="${product.imageUrl || ''}">
                    </div>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">商品名称</label>
                        <input type="text" id="editProdName" value="${product.name}" class="w-full px-4 py-2 rounded-lg border focus:border-pink-500">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">价格 (RM)</label>
                            <input type="number" id="editProdPrice" value="${product.price}" step="0.01" class="w-full px-4 py-2 rounded-lg border focus:border-pink-500">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">当前库存 (可以直接改)</label>
                            <input type="number" id="editProdStock" value="${product.stock || 0}" min="0" 
                                class="w-full px-4 py-2 rounded-lg border-2 border-blue-200 bg-blue-50 focus:border-blue-500 font-bold text-blue-700">
                        </div>
                    </div>

                    <div class="flex gap-3 mt-6">
                        <button id="cancelEditProd" class="flex-1 py-3 rounded-xl font-bold text-gray-500 border border-gray-200">取消</button>
                        <button id="confirmEditProd" class="flex-1 py-3 rounded-xl font-bold text-white shadow-md" style="background: ${config.primary_action_color};">保存修改</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 图片上传
    const fileInput = document.getElementById('editProdFile');
    const imageInput = document.getElementById('editProdImgBase64');
    const imagePreview = document.getElementById('editProdPreview');

    document.getElementById('editProdImgContainer').addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            openCropperModal(file, (base64) => {
                imageInput.value = base64;
                imagePreview.src = base64;
            }, false);
        }
    });

    // 保存逻辑
    document.getElementById('confirmEditProd').addEventListener('click', async () => {
        const name = document.getElementById('editProdName').value;
        const price = parseFloat(document.getElementById('editProdPrice').value);
        const stock = parseInt(document.getElementById('editProdStock').value) || 0; // 获取新库存
        const img = document.getElementById('editProdImgBase64').value;

        if (!name || isNaN(price)) return showToast('请填写完整信息');

        await updateRecord(product, {
            name,
            price,
            stock, // 更新库存
            imageUrl: img
        });

        showToast('✅ 商品资料已更新');
        modal.remove();
        renderApp();
    });

    document.getElementById('cancelEditProd').addEventListener('click', () => modal.remove());
}

// ==================== 购物车逻辑 ====================

// ==========================================
// 👇 V1.2.X 核心：顾客加购 (同步到数据库)
// ==========================================
async function addToCart(productId) {
    if (!loggedInCustomerName) {
        showToast('请先登录后再加入购物车');
        return;
    }

    const products = getDataByType('product');
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // 1. 获取当前顾客的最新数据
    const customers = getDataByType('customer_account');
    const me = customers.find(c => c.username === loggedInCustomerName);
    
    if (!me) return;

    // 2. 获取他现有的购物车 (如果没有就初始化为空)
    let myCart = me.cart || [];

    // 3. 检查是否已存在
    const existingItem = myCart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        myCart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            type: 'product' // 标记类型
        });
    }

    // 4. 🔥 关键：保存回数据库！这样老板那边才能看到
    await updateRecord(me, { cart: myCart });
    
    showToast(`🛒 已加入: ${product.name}`);
    
    // 更新全局变量 cart (用于UI显示小红点)
    cart = myCart; 
    renderApp(); 
}

// ==========================================
// 👇 V1.2.X 修复：购物车 (下单后清空数据库)
// ==========================================
function showCartModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    // 计算总价
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
    
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.secondary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 80vh; overflow-y: auto;">
            <div class="flex justify-between items-center mb-6">
                <h3 style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.secondary_action_color};">
                    购物车 🛒
                </h3>
                <button id="closeCartBtn" style="background: none; border: none; font-size: 24px; color: ${config.text_color}; cursor: pointer;">✕</button>
            </div>
            
            ${cart.length === 0 ? `
                <div class="text-center py-8">
                    <p style="opacity: 0.6;">购物车是空的，快去选购吧！</p>
                </div>
            ` : `
                <div class="space-y-4 mb-6">
                    ${cart.map((item, index) => `
                        <div class="flex justify-between items-center p-3 rounded-lg" style="background: ${config.secondary_action_color}11;">
                            <div class="flex-1">
                                <h4 style="font-weight: 700; color: ${config.text_color};">${item.name}</h4>
                                <p style="font-size: ${config.font_size * 0.9}px; color: ${config.secondary_action_color};">
                                    RM${item.price} x ${item.quantity}
                                </p>
                            </div>
                            <div class="flex items-center gap-3">
                                <span style="font-weight: 700;">RM${(item.price * item.quantity).toFixed(2)}</span>
                                <button class="removeFromCartBtn text-red-500" data-index="${index}" style="padding: 4px 8px;">🗑️</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="flex justify-between items-center pt-4 border-t-2 border-gray-100 mb-6">
                    <span style="font-size: ${config.font_size * 1.1}px; font-weight: 700;">总计:</span>
                    <span style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.secondary_action_color};">RM${total}</span>
                </div>
                
                <button id="checkoutBtn" class="w-full btn-primary py-3 rounded-lg font-bold shadow-md"
                    style="background: ${config.secondary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                    提交订单
                </button>
            `}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定事件
    document.getElementById('closeCartBtn').addEventListener('click', () => modal.remove());
    
    // 删除商品
    document.querySelectorAll('.removeFromCartBtn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = parseInt(e.target.dataset.index);
            cart.splice(index, 1);
            
            // 同步更新数据库
            const customers = getDataByType('customer_account');
            const me = customers.find(c => c.username === loggedInCustomerName);
            if (me) await updateRecord(me, { cart: cart });

            modal.remove();
            showCartModal(config);
            renderApp();
        });
    });
    
    // 结算按钮 (下单)
    document.getElementById('checkoutBtn')?.addEventListener('click', async () => {
        if (!loggedInCustomerName) {
            showToast('请先登录后再提交订单');
            return;
        }
        
        // 创建订单
        await createRecord({
            type: 'order',
            customerName: loggedInCustomerName,
            items: cart,
            totalAmount: total,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        // 🔥 关键修复：清空数据库里的购物车
        const customers = getDataByType('customer_account');
        const me = customers.find(c => c.username === loggedInCustomerName);
        if (me) {
            await updateRecord(me, { cart: [] });
        }
        
        showToast('🎉 订单已提交！等待店家确认。');
        cart = []; // 清空本地
        modal.remove();
        renderApp();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// === 商品详情弹窗 (新增) ===
function showProductDetailModal(config, product) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    // 获取购物车开关状态
    const settings = getDiscountSettings();
    const isShopEnabled = settings.enable_shop !== false; // 默认为开启
    const displayImage = product.imageUrl || './assets/default_eye.png';

    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 0; border-radius: 16px; max-width: 400px; width: 100%; border: 2px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;">
            <div style="height: 300px; overflow: hidden; position: relative;">
                <img src="${displayImage}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='./assets/default_eye.png'">
                <button id="closeDetailBtn" style="position: absolute; top: 16px; right: 16px; background: rgba(0,0,0,0.5); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer;">✕</button>
            </div>
            
            <div class="p-6">
                <h3 class="mb-2" style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.primary_action_color};">
                    ${product.name}
                </h3>
                <p class="mb-4" style="font-size: ${config.font_size * 1.4}px; color: ${config.secondary_action_color}; font-weight: 700;">
                    RM${product.price}
                </p>
                
                <div class="mb-6 p-4 rounded-lg" style="background: ${config.primary_action_color}11;">
                    <p style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.8; line-height: 1.6;">
                        ${product.description}
                    </p>
                </div>

                ${isShopEnabled ? `
                    <button id="detailAddToCartBtn" class="w-full btn-primary py-3 rounded-lg shadow-md"
                        style="background: ${config.secondary_action_color}; color: #ffffff; font-family: Lato, sans-serif; font-size: ${config.font_size * 1.1}px; font-weight: bold;">
                        加入购物车 🛒
                    </button>
                ` : `
                    <button disabled class="w-full py-3 rounded-lg"
                        style="background: #e5e7eb; color: #9ca3af; font-family: Lato, sans-serif; font-size: ${config.font_size}px;">
                        仅供展示
                    </button>
                `}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 关闭按钮
    document.getElementById('closeDetailBtn').addEventListener('click', () => modal.remove());
    
    // 详情页里的加入购物车
    if (isShopEnabled) {
        document.getElementById('detailAddToCartBtn').addEventListener('click', () => {
            addToCart(product.id);
            modal.remove();
        });
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// === 动态管理弹窗 (新增) ===
function showPostModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;">
            <h3 class="mb-6" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                发布新动态
            </h3>
            
            <form id="postForm">
                <div class="mb-4">
                    <label class="block mb-2" style="font-weight: 600;">标题</label>
                    <input type="text" id="postTitle" required placeholder="例如：新春大促开启！"
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                </div>

                <div class="mb-4">
                    <label class="block mb-2" style="font-weight: 600;">配图 (可选)</label>
                    <input type="file" id="postFileInput" accept="image/*" style="display: none;">
                    
                    <div id="postDropZone" style="border: 2px dashed ${config.primary_action_color}; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s; background: ${config.primary_action_color}11;">
                        <p id="postUploadText" style="opacity: 0.7; pointer-events: none;">
                            📸 点击上传海报/照片
                        </p>
                        <img id="postImagePreview" src="" style="max-height: 150px; display: none; margin: 0 auto; border-radius: 8px;">
                    </div>
                    <input type="text" id="postImage" placeholder="或粘贴图片链接..." 
                        class="w-full px-4 py-2 mt-2 rounded-lg border-2 text-sm" style="border-color: ${config.text_color}33; color: ${config.text_color};">
                </div>
                
                <div class="mb-6">
                    <label class="block mb-2" style="font-weight: 600;">内容详情</label>
                    <textarea id="postContent" required rows="4" placeholder="写点什么..."
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;"></textarea>
                </div>
                
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                        style="background: ${config.primary_action_color}; color: #ffffff;">发布</button>
                    <button type="button" id="cancelPostBtn" class="flex-1 py-3 rounded-lg"
                        style="border: 2px solid ${config.text_color};">取消</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 图片逻辑
    const dropZone = document.getElementById('postDropZone');
    const fileInput = document.getElementById('postFileInput');
    const imageInput = document.getElementById('postImage');
    const preview = document.getElementById('postImagePreview');
    const text = document.getElementById('postUploadText');

    const updatePreview = (src) => {
        if (src) { preview.src = src; preview.style.display = 'block'; text.style.display = 'none'; }
        else { preview.style.display = 'none'; text.style.display = 'block'; }
    };
    imageInput.addEventListener('input', () => updatePreview(imageInput.value));
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            openCropperModal(file, (base64) => {
                imageInput.value = base64;
                updatePreview(base64);
            });
        }
    });

    document.getElementById('postForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createRecord({
            type: 'post',
            postTitle: document.getElementById('postTitle').value,
            postContent: document.getElementById('postContent').value,
            imageUrl: imageInput.value, // 保存图片
            createdAt: new Date().toISOString()
        });
        modal.remove();
    });
    
    document.getElementById('cancelPostBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ==========================================
// 👇 [v1.3.2] 数据备份与恢复 (修复版)
// ==========================================
function exportData() {
    // 获取所有类型的数据
    const allDataExport = {
        metadata: {
            version: "v1.3.2",
            exportedAt: new Date().toISOString(),
            app: "Gem Brow SaaS"
        },
        data: loadDb() // 直接获取当前 LocalStorage 里的所有数据
    };
    
    const dataStr = JSON.stringify(allDataExport, null, 2); // 美化格式
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    // 生成带时间的文件名: GemBrow_Backup_2026-01-02_1430.json
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const exportFileDefaultName = `GemBrow_Backup_${dateStr}_${timeStr}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('✅ 备份文件已下载，请妥善保存');
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;

    // 二次确认，防止手滑覆盖
    if (!confirm("⚠️ 高能预警：\n\n导入数据将【彻底覆盖/清空】当前所有数据！\n导入后无法撤销。\n\n建议先点左边的「导出」备份当前数据。\n\n确定要继续吗？")) {
        input.value = ''; // 清空选择
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonContent = JSON.parse(e.target.result);
            let finalData = [];

            // 兼容性处理：检查是新版结构(带metadata)还是旧版结构(纯数组)
            if (Array.isArray(jsonContent)) {
                // 旧版备份文件
                finalData = jsonContent;
            } else if (jsonContent.data && Array.isArray(jsonContent.data)) {
                // 新版备份文件
                finalData = jsonContent.data;
            } else {
                throw new Error("文件格式不正确，找不到数据核心");
            }
            
            // 简单的完整性校验 (至少要有一条数据或者空数组)
            if (!Array.isArray(finalData)) throw new Error("数据损坏");

            // 🔥 关键修复：Key 必须是 'gembrow_data'
            localStorage.setItem('gembrow_data', JSON.stringify(finalData));
            
            // 立即刷新内存数据
            if (window.dataHandler) window.dataHandler.onDataChanged(finalData);
            
            alert("🎉 数据恢复成功！页面将自动刷新。");
            location.reload();
            
        } catch (err) {
            console.error(err);
            alert("❌ 恢复失败：文件可能已损坏或格式错误。\n\n错误信息: " + err.message);
        }
    };
    reader.readAsText(file);
}

// ==========================================
// 👇 [v1.3.3] 全局挂件 (修复层级遮挡问题)
// ==========================================
function initGlobalWidgets() {
    // 1. 注入 CSS (样式保持不变)
    if (!document.getElementById('global-widget-styles')) {
        const style = document.createElement('style');
        style.id = 'global-widget-styles'; 
        style.innerHTML = `
            .goog-te-banner-frame.skiptranslate { display: none !important; height: 0 !important; visibility: hidden !important; } 
            iframe.goog-te-banner-frame { display: none !important; height: 0 !important; visibility: hidden !important; }
            body { top: 0px !important; position: static !important; min-height: 100vh !important; }
            #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
            .VIpgJd-ZVi9od-ORHb-OEVmcd { display: none !important; }
            #google_translate_element img { display: none !important; }
            .goog-te-gadget-simple { background-color: transparent !important; border: none !important; padding: 0 !important; font-size: 13px !important; }
            .goog-te-menu-value span { color: #555 !important; font-weight: bold; border: none !important; }
            .goog-te-menu-value span:nth-child(2), .goog-te-menu-value span:nth-child(3) { display: none !important; }
            
            /* 打印时隐藏 */
            @media print {
                .floating-wa-btn { display: none !important; }
                #google_translate_element { display: none !important; }
                .toast { display: none !important; }
            }
        `;
        document.head.appendChild(style);
    }

    // 2. WhatsApp 按钮 
    const settings = getDiscountSettings(); 
    const myPhone = settings.wa_number || "60123456789"; 
    const defaultText = "你好，我想咨询美睫服务 (Hi, I am interested in eyelash services)";
    const waUrl = `https://wa.me/${myPhone}?text=${encodeURIComponent(defaultText)}`;
    
    const oldBtn = document.querySelector('.floating-wa-btn');
    if (oldBtn) oldBtn.remove();

    const waBtn = document.createElement('a');
    waBtn.href = waUrl;
    waBtn.target = "_blank";
    waBtn.className = "floating-wa-btn print:hidden";
    
    waBtn.style.cssText = `
        position: fixed;
        bottom: 110px; 
        right: 20px;
        width: 60px;
        height: 60px;
        background-color: #25D366;
        color: white;
        border-radius: 50%;
        text-align: center;
        font-size: 35px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
        /* 👇 修改：从 9999 降为 45，让位给弹窗 (z-50) */
        z-index: 45; 
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s;
        text-decoration: none;
    `;
    waBtn.innerHTML = '<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style="width: 35px; height: 35px;">';
    
    waBtn.onmouseover = () => waBtn.style.transform = "scale(1.1)";
    waBtn.onmouseout = () => waBtn.style.transform = "scale(1)";

    document.body.appendChild(waBtn);

    // 3. Google 翻译 
    if (document.getElementById('google_translate_element')) return;

    const translateDiv = document.createElement('div');
    translateDiv.id = "google_translate_element";
    translateDiv.className = "print:hidden";
    translateDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px; 
        /* 👇 修改：从 10000 降为 45，让位给弹窗 */
        z-index: 45; 
        background: rgba(255, 255, 255, 0.9);
        padding: 4px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        border: 1px solid #eee;
    `;
    document.body.appendChild(translateDiv);

    window.googleTranslateElementInit = function() {
        new google.translate.TranslateElement({
            pageLanguage: 'zh-CN', 
            includedLanguages: 'en,ms,zh-CN',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
        }, 'google_translate_element');
    };

    const libScript = document.createElement('script');
    libScript.type = 'text/javascript';
    libScript.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    libScript.onerror = function() { translateDiv.style.display = 'none'; };
    document.body.appendChild(libScript);
}

// ==========================================
// 👇 新增：图片自动压缩工具 (把大图压成小图)
// ==========================================
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                // 1. 计算新的宽高 (保持比例)
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                // 2. 用 Canvas 重新画图 (相当于压缩)
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 3. 导出为 Base64 (JPEG 格式，70% 质量)
                // 这样生成的字符串会比原来短很多，数据库就不会爆了
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// ==========================================
// 👇 新增：设置休息时间弹窗
// ==========================================
function showBlockTimeModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 16px; max-width: 400px; width: 100%; border: 3px solid #374151; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h3 class="mb-4 text-center font-bold text-xl text-gray-800">⛔ 设置休息/锁定时间</h3>
            
            <form id="blockTimeForm">
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block mb-1 font-bold text-sm">日期</label>
                        <input type="date" id="blockDate" required min="${new Date().toISOString().split('T')[0]}"
                            class="w-full px-3 py-2 border-2 rounded-lg">
                    </div>
                    <div>
                        <label class="block mb-1 font-bold text-sm">开始时间</label>
                        <input type="time" id="blockTime" required class="w-full px-3 py-2 border-2 rounded-lg">
                    </div>
                </div>
                
                <div class="mb-6">
                    <label class="block mb-1 font-bold text-sm">锁定多久 (分钟)</label>
                    <select id="blockDuration" class="w-full px-3 py-2 border-2 rounded-lg">
                        <option value="60">1 小时</option>
                        <option value="90">1.5 小时</option>
                        <option value="120">2 小时</option>
                        <option value="180">3 小时</option>
                        <option value="480">全天 (8小时)</option>
                    </select>
                </div>

                <div class="flex gap-3">
                    <button type="submit" class="flex-1 py-3 rounded-lg font-bold text-white bg-gray-800">确认锁定</button>
                    <button type="button" id="cancelBlockBtn" class="flex-1 py-3 rounded-lg border-2">取消</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('blockTimeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('blockDate').value;
        const time = document.getElementById('blockTime').value;
        const duration = parseInt(document.getElementById('blockDuration').value);
        
        await createRecord({
            type: 'booking',
            customerName: '⛔ 休息中 (已锁定)',
            customerPhone: '-',
            serviceName: '商家休息',
            appointmentDate: date,
            appointmentTime: time,
            duration: duration,
            status: 'completed', // 直接设为 completed 或者 pending 都可以，反正占位了
            totalAmount: 0
        });
        
        showToast('✅ 时间段已锁定');
        modal.remove();
        renderApp();
    });
    
    document.getElementById('cancelBlockBtn').addEventListener('click', () => modal.remove());
}

// ==========================================
// 👇 [v1.3.1] 智能收银台 (双端适配版)
// ==========================================
function showCashierModal(config, booking) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    // ----------------------------------------------------------------
    // 1. 数据准备 (保持原逻辑不变)
    // ----------------------------------------------------------------
    const allProducts = getDataByType('product') || [];
    const allServices = getDataByType('service') || [];
    const customers = getDataByType('customer_account') || [];
    const allOrders = getDataByType('order') || [];

    // 查找服务价格
    let initialServicePrice = 0;
    const matchedService = allServices.find(s => s.name === booking.serviceName);
    if (matchedService) initialServicePrice = parseFloat(matchedService.price);

    let cartItems = [
        { type: 'service', id: booking.serviceId || 'srv_booking', name: booking.serviceName, price: initialServicePrice, quantity: 1 }
    ];

    let mergedOrderIds = [];

    // 同步购物车
    const currentCustomer = customers.find(c => c.username === booking.customerName);
    if (currentCustomer && currentCustomer.cart && currentCustomer.cart.length > 0) {
        currentCustomer.cart.forEach(cartItem => {
            cartItems.push({ ...cartItem, fromSource: 'cart', type: 'product' });
        });
        showToast(`🛒 已同步购物车内的商品`);
    }

    // 同步订单
    const pendingOrders = allOrders.filter(o => o.customerName === booking.customerName && o.status === 'pending');
    if (pendingOrders.length > 0) {
        pendingOrders.forEach(order => {
            mergedOrderIds.push(order.id);
            order.items.forEach(item => {
                cartItems.push({ ...item, fromSource: 'order', type: 'product' });
            });
        });
        showToast(`📑 已合并 ${pendingOrders.length} 张待处理订单`);
    }

    // ----------------------------------------------------------------
    // 2. 渲染购物车列表函数 (保持原逻辑)
    // ----------------------------------------------------------------
    const renderCart = () => {
        const listEl = document.getElementById('posCartList');
        const totalEl = document.getElementById('posTotalAmount');
        const badgeEl = document.getElementById('mobile-cart-badge'); // 小红点
        const adjustment = parseFloat(document.getElementById('posAdjustment')?.value || 0);
        
        if (!listEl || !totalEl) return;

        let subtotal = 0;
        let productCount = 0; // 计算商品数量(不含服务)
        
        listEl.innerHTML = cartItems.map((item, index) => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            if (item.type !== 'service') productCount += item.quantity;
            
            let sourceBadge = '';
            if (item.fromSource === 'cart') sourceBadge = `<span class="text-[10px] bg-blue-100 text-blue-600 px-1 rounded ml-2">🛒</span>`;
            else if (item.fromSource === 'order') sourceBadge = `<span class="text-[10px] bg-purple-100 text-purple-600 px-1 rounded ml-2">📑</span>`;

            return `
                <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                    <div class="flex-1">
                        <div class="font-bold text-gray-700 text-sm flex items-center flex-wrap">
                            ${item.type === 'service' ? '💆‍♀️' : '🛍️'} ${item.name} ${sourceBadge}
                        </div>
                        <div class="text-xs text-gray-400 mt-1">单价: RM${item.price.toFixed(2)}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        ${item.type === 'product' ? `
                            <div class="flex items-center bg-white border rounded-lg h-8">
                                <button onclick="window.updatePosQty(${index}, -1)" class="px-2 text-gray-500 hover:text-red-500 font-bold">-</button>
                                <span class="px-2 text-sm font-bold w-6 text-center">${item.quantity}</span>
                                <button onclick="window.updatePosQty(${index}, 1)" class="px-2 text-gray-500 hover:text-green-500 font-bold">+</button>
                            </div>
                        ` : `<span class="text-sm font-bold text-gray-500">x1</span>`}
                        
                        <span class="font-bold text-gray-700 w-16 text-right">RM${itemTotal.toFixed(2)}</span>
                        ${item.type !== 'service' ? `<button onclick="window.removePosItem(${index})" class="text-gray-400 hover:text-red-500 px-1">✕</button>` : '<span class="w-4"></span>'} 
                    </div>
                </div>
            `;
        }).join('');

        const finalTotal = subtotal + adjustment;
        totalEl.innerText = `RM${finalTotal.toFixed(2)}`;
        
        // 更新小红点
        if(badgeEl) {
             badgeEl.style.display = productCount > 0 ? 'block' : 'none';
             badgeEl.innerText = productCount;
        }

        const btn = document.getElementById('confirmPaymentBtn');
        btn.dataset.total = finalTotal;
        if (btn.dataset.method) btn.innerText = `确认收款 RM${finalTotal.toFixed(2)}`;
    };

    window.removePosItem = (index) => { cartItems.splice(index, 1); renderCart(); };
    window.updatePosQty = (index, change) => {
        const item = cartItems[index];
        if (!item) return;
        const newQty = item.quantity + change;
        if (newQty < 1) return; 
        
        const productData = allProducts.find(p => p.id === item.id);
        const maxStock = productData ? parseInt(productData.stock || 9999) : 9999;
        if (newQty > maxStock) return showToast(`库存不足！当前仅剩 ${maxStock}`);

        item.quantity = newQty;
        renderCart();
    };

    // ----------------------------------------------------------------
    // 3. 🔥 [核心修改] 新的 HTML 结构 (支持双页切换)
    // ----------------------------------------------------------------
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[90vh] md:h-[85vh]">
            
            <div class="md:hidden flex bg-white border-b border-gray-200 shrink-0">
                <button id="tab-btn-menu" onclick="window.switchPosTab('menu')" class="flex-1 py-4 text-sm font-bold text-center border-b-2 border-pink-500 text-pink-600 bg-pink-50 transition-colors">
                    🛍️ 选购商品
                </button>
                <button id="tab-btn-cart" onclick="window.switchPosTab('cart')" class="flex-1 py-4 text-sm font-bold text-center text-gray-500 relative transition-colors">
                    🧾 结算清单
                    <span id="mobile-cart-badge" class="hidden absolute top-3 right-8 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">0</span>
                </button>
                <button id="closePosBtnMobile" class="px-4 text-gray-400 border-l border-gray-100">✕</button>
            </div>

            <div class="flex flex-1 overflow-hidden relative">
                
                <div id="pos-panel-menu" class="w-full md:w-5/12 bg-gray-50 p-4 md:p-6 flex flex-col border-r border-gray-200 overflow-y-auto h-full absolute md:relative z-10 md:z-auto inset-0 md:inset-auto bg-gray-50">
                    
                    <div class="hidden md:block mb-6">
                        <h3 class="text-xl font-bold text-gray-800 mb-1">💰 收银台</h3>
                        <p class="text-sm text-gray-500">单号: <span class="font-mono font-bold">${booking.receiptNumber || '结算时生成'}</span></p>
                    </div>

                    <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-4">
                        <h4 class="font-bold text-gray-700 mb-4 text-sm flex items-center gap-2">🛍️ 添加商品</h4>
                        <div class="space-y-4">
                            <select id="productSelect" class="w-full px-4 py-3 rounded-lg border bg-gray-50 text-sm font-bold focus:outline-none focus:border-pink-500">
                                <option value="">👇 点击选择商品...</option>
                                ${allProducts.map(p => `<option value="${p.id}" data-price="${p.price}" data-name="${p.name}" data-stock="${p.stock}">${p.name} (RM${p.price}) - 库存: ${p.stock !== undefined ? p.stock : '未设置'}</option>`).join('')}
                            </select>
                            
                            <div class="flex items-center gap-3">
                                <button type="button" onclick="document.getElementById('productQty').stepDown()" class="w-12 h-12 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold text-xl">-</button>
                                <input type="number" id="productQty" value="1" min="1" class="flex-1 h-12 text-center border-2 rounded-lg font-bold text-lg" readonly>
                                <button type="button" onclick="document.getElementById('productQty').stepUp()" class="w-12 h-12 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold text-xl">+</button>
                            </div>
                            
                            <button id="addPosItemBtn" class="w-full py-4 bg-gray-800 text-white rounded-xl text-base font-bold shadow-lg hover:bg-black transition-all transform active:scale-95">
                                + 加入清单
                            </button>
                        </div>
                    </div>

                    <div class="bg-white p-5 rounded-xl shadow-sm border border-pink-100 mt-auto mb-20 md:mb-0">
                        <h4 class="font-bold text-pink-600 mb-3 text-sm">⚖️ 补差价 / 折扣</h4>
                        <div class="flex gap-2 items-center">
                            <span class="text-gray-400 font-bold">RM</span>
                            <input type="number" id="posAdjustment" value="0" step="1" class="flex-1 px-3 py-2 rounded-lg border border-pink-200 text-pink-600 font-bold text-lg focus:outline-none">
                        </div>
                        <p class="text-[10px] text-gray-400 mt-2">提示: 输入负数 (例如 -10) 代表折扣</p>
                    </div>
                </div>

                <div id="pos-panel-cart" class="w-full md:w-7/12 bg-white p-4 md:p-6 flex flex-col h-full border-l border-gray-100 hidden md:flex absolute md:relative inset-0 md:inset-auto z-20 md:z-auto">
                    
                    <button id="closePosBtnDesktop" class="hidden md:block absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg></button>
                    
                    <div class="mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-blue-900 text-sm">当前客户</h4>
                            <p class="text-blue-700 font-bold text-lg">${booking.customerName}</p>
                        </div>
                        <div class="text-right">
                             <span class="text-xs bg-white text-blue-600 px-3 py-1 rounded-full font-bold shadow-sm border border-blue-100">${booking.customerPhone}</span>
                        </div>
                    </div>

                    <div class="flex-1 overflow-y-auto mb-4 pr-1 custom-scrollbar">
                        <div id="posCartList" class="space-y-2 pb-4"></div>
                    </div>

                    <div class="border-t pt-4 bg-white mt-auto">
                        <div class="flex justify-between items-end mb-4">
                            <div>
                                <p class="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Amount</p>
                                <p class="text-sm text-gray-500">应收总额</p>
                            </div>
                            <span id="posTotalAmount" class="text-4xl font-bold" style="color: ${config.primary_action_color};">RM0.00</span>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            <button class="payMethodBtn flex items-center justify-center gap-2 py-3 border-2 rounded-xl font-bold text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all group" data-method="TNG">
                                <span class="grayscale group-hover:grayscale-0 text-xl transition-all">🔵</span> TNG
                            </button>
                            <button class="payMethodBtn flex items-center justify-center gap-2 py-3 border-2 rounded-xl font-bold text-gray-400 hover:border-green-500 hover:text-green-500 transition-all group" data-method="Cash">
                                <span class="grayscale group-hover:grayscale-0 text-xl transition-all">💵</span> Cash
                            </button>
                        </div>
                        
                        <button id="confirmPaymentBtn" disabled class="w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl opacity-40 cursor-not-allowed transition-all" style="background: ${config.primary_action_color};">
                            请选择支付方式
                        </button>
                    </div>
                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);
    renderCart(); // 初始化渲染一次

    // ----------------------------------------------------------------
    // 4. 全局切换函数 (window级别，方便HTML调用)
    // ----------------------------------------------------------------
    window.switchPosTab = (tabName) => {
        const menuPanel = document.getElementById('pos-panel-menu');
        const cartPanel = document.getElementById('pos-panel-cart');
        const btnMenu = document.getElementById('tab-btn-menu');
        const btnCart = document.getElementById('tab-btn-cart');

        // 只在手机端生效 (通过 class hidden 控制)
        if (tabName === 'menu') {
            menuPanel.classList.remove('hidden');
            cartPanel.classList.add('hidden');
            // 按钮样式
            btnMenu.className = "flex-1 py-4 text-sm font-bold text-center border-b-2 border-pink-500 text-pink-600 bg-pink-50 transition-colors";
            btnCart.className = "flex-1 py-4 text-sm font-bold text-center text-gray-500 relative transition-colors border-b border-gray-200";
        } else {
            menuPanel.classList.add('hidden');
            cartPanel.classList.remove('hidden');
            // 按钮样式
            btnMenu.className = "flex-1 py-4 text-sm font-bold text-center text-gray-500 relative transition-colors border-b border-gray-200";
            btnCart.className = "flex-1 py-4 text-sm font-bold text-center border-b-2 border-pink-500 text-pink-600 bg-pink-50 transition-colors";
            
            // 重要：如果在电脑端，必须保证两个都显示
            // (Tailwind 的 md:flex 会覆盖 hidden，所以其实只要 HTML 写对了 md:flex 这里的 JS 不会影响电脑端)
        }
    };

    // ----------------------------------------------------------------
    // 5. 事件绑定 (保持原逻辑)
    // ----------------------------------------------------------------
    const closeModal = () => { modal.remove(); delete window.removePosItem; delete window.updatePosQty; delete window.switchPosTab; };
    document.getElementById('closePosBtnDesktop')?.addEventListener('click', closeModal);
    document.getElementById('closePosBtnMobile')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    document.getElementById('addPosItemBtn').addEventListener('click', () => {
        const select = document.getElementById('productSelect');
        const qtyInput = document.getElementById('productQty');
        const option = select.options[select.selectedIndex];
        if (!option.value) return showToast('请先选择一个商品！');
        
        let stock = option.dataset.stock;
        stock = (stock === "undefined" || stock === "") ? 9999 : parseInt(stock);
        const qty = parseInt(qtyInput.value);
        const price = parseFloat(option.dataset.price);
        const name = option.dataset.name || option.text.split('(')[0].trim();

        if (qty > stock) return showToast(`⚠️ 库存不足！当前仅剩 ${stock} 件`);

        const existing = cartItems.find(i => i.id === option.value && i.type === 'product');
        if (existing) {
            if (existing.quantity + qty > stock) return showToast('加购数量超过总库存！');
            existing.quantity += qty;
        } else {
            cartItems.push({ type: 'product', id: option.value, name, price, quantity: qty });
        }
        renderCart();
        
        // 手机端优化：加购成功后，提示去结算，或者自动跳转？
        // 暂时只给 Toast 提示，不强制跳转，方便连续加购
        showToast('✅ 已加入清单');
        
        // 视觉反馈：小红点跳动
        const badge = document.getElementById('mobile-cart-badge');
        if(badge) {
            badge.classList.add('animate-bounce');
            setTimeout(()=>badge.classList.remove('animate-bounce'), 1000);
        }

        select.value = ""; qtyInput.value = 1; 
    });

    document.getElementById('posAdjustment').addEventListener('input', renderCart);

    // 支付按钮逻辑 (保持不变)
    let selectedMethod = '';
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    
    document.querySelectorAll('.payMethodBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.payMethodBtn').forEach(b => {
                b.classList.remove('border-blue-500', 'text-blue-500', 'bg-blue-50', 'border-green-500', 'text-green-500', 'bg-green-50');
                b.classList.add('text-gray-400', 'border-gray-200');
            });
            
            const method = btn.dataset.method;
            selectedMethod = method;
            
            btn.classList.remove('text-gray-400', 'border-gray-200');
            if (method === 'TNG') {
                btn.classList.add('border-blue-500', 'text-blue-500', 'bg-blue-50');
                const settings = getDataByType('discount_settings')[0] || {};
                const qrUrl = settings.tng_qr_url || config.tng_qr_url;
                if (qrUrl) showQrPopup(qrUrl);
                else showToast('⚠️ 未设置收款二维码');
            } else {
                btn.classList.add('border-green-500', 'text-green-500', 'bg-green-50');
            }

            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.dataset.method = method;
            renderCart();
        });
    });

    confirmBtn.addEventListener('click', async () => {
        if (!selectedMethod) return;
        confirmBtn.innerText = "⏳ 检查库存...";
        confirmBtn.disabled = true;

        const productsToUpdate = cartItems.filter(i => i.type === 'product');
        for (const item of productsToUpdate) {
            const productData = allProducts.find(p => p.id === item.id);
            if (productData) {
                const currentStock = parseInt(productData.stock || 0);
                if (item.quantity > currentStock) {
                    showToast(`⛔ 错误：${item.name} 库存不足！仅剩 ${currentStock}`);
                    confirmBtn.innerText = "❌ 库存不足";
                    setTimeout(() => { confirmBtn.disabled = false; renderCart(); }, 2000);
                    return; 
                }
            }
        }

        const finalTotal = parseFloat(confirmBtn.dataset.total);
        const now = new Date().toISOString();
        const receiptNo = booking.receiptNumber || generateReceiptNumber();

        for (const item of productsToUpdate) {
            const productData = allProducts.find(p => p.id === item.id);
            if (productData) {
                const newStock = Math.max(0, productData.stock - item.quantity);
                await updateRecord(productData, { stock: newStock });
            }
        }

        await updateRecord(booking, {
            status: 'completed',
            paymentMethod: selectedMethod,
            totalAmount: finalTotal,
            receiptNumber: receiptNo,
            items: cartItems,
            completedAt: now,
            adjustment: document.getElementById('posAdjustment').value
        });

        await createRecord({
            type: 'order',
            bookingId: booking.id,
            items: cartItems,
            totalAmount: finalTotal,
            paymentMethod: selectedMethod,
            createdAt: now,
            receiptNumber: receiptNo,
            status: 'completed'
        });

        if (currentCustomer && currentCustomer.cart && currentCustomer.cart.length > 0) {
            await updateRecord(currentCustomer, { cart: [] });
        }
        
        if (mergedOrderIds.length > 0) {
            for (const orderId of mergedOrderIds) {
                const originalOrder = allOrders.find(o => o.id === orderId);
                if (originalOrder) await updateRecord(originalOrder, { 
                    status: 'completed', 
                    mergedToReceipt: receiptNo,
                    completedAt: now 
                });
            }
        }

        showToast(`✅ 收款成功！单号: ${receiptNo}`);
        closeModal();
        renderApp();
        if (typeof showReceiptModal === 'function') {
             showReceiptModal(config, { ...booking, receiptNumber: receiptNo, totalAmount: finalTotal, items: cartItems, paymentMethod: selectedMethod, completedAt: now });
        }
    });
}

// ==========================================
// 👇 新增：历史与账单页面 (双Tab)
// ==========================================
function renderHistoryPage(config) {
    // 1. 获取预约历史 (已完成 + 已取消)
    const allBookings = getDataByType('booking');
    const historyBookings = allBookings.filter(b => 
        b.customerName === loggedInCustomerName && 
        (b.status === 'completed' || b.status === 'cancelled')
    ).reverse(); // 最新的在前面

    // 2. 获取购物记录 (Sales Records) - 配合收银台功能
    const allSales = getDataByType('sales_record');
    const mySales = allSales.filter(s => s.customer === loggedInCustomerName).reverse();

    // 3. Tab 切换逻辑
    setTimeout(() => {
        const btnBook = document.getElementById('tabBtnBooking');
        const btnShop = document.getElementById('tabBtnShopping');
        const contentBook = document.getElementById('contentBooking');
        const contentShop = document.getElementById('contentShopping');

        if(btnBook && btnShop) {
            btnBook.addEventListener('click', () => {
                btnBook.classList.add('text-pink-600', 'border-b-2', 'border-pink-600');
                btnBook.classList.remove('text-gray-400');
                btnShop.classList.remove('text-pink-600', 'border-b-2', 'border-pink-600');
                btnShop.classList.add('text-gray-400');
                contentBook.style.display = 'block';
                contentShop.style.display = 'none';
            });
            btnShop.addEventListener('click', () => {
                btnShop.classList.add('text-pink-600', 'border-b-2', 'border-pink-600');
                btnShop.classList.remove('text-gray-400');
                btnBook.classList.remove('text-pink-600', 'border-b-2', 'border-pink-600');
                btnBook.classList.add('text-gray-400');
                contentShop.style.display = 'block';
                contentBook.style.display = 'none';
            });
        }
    }, 100);

    return `
        <div class="animate-fade-in pb-20">
            <h2 class="mb-6" style="font-size: ${config.font_size * 2}px; font-weight: 700; color: ${config.primary_action_color};">
                📜 历史与账单
            </h2>

            <div class="flex border-b border-gray-200 mb-6">
                <button id="tabBtnBooking" class="flex-1 pb-3 font-bold text-pink-600 border-b-2 border-pink-600 transition-colors">
                    预约记录
                </button>
                <button id="tabBtnShopping" class="flex-1 pb-3 font-bold text-gray-400 transition-colors">
                    购物账单
                </button>
            </div>

            <div id="contentBooking">
                ${historyBookings.length === 0 ? `
                    <div class="text-center py-10 opacity-50"><p>暂无历史预约</p></div>
                ` : `
                    <div class="space-y-4">
                        ${historyBookings.map(b => `
                            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center opacity-80">
                                <div>
                                    <div class="font-bold text-gray-800">${b.serviceName}</div>
                                    <div class="text-xs text-gray-500">${b.appointmentDate} @ ${b.appointmentTime}</div>
                                </div>
                                <span class="px-2 py-1 rounded text-xs font-bold ${b.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-400'}">
                                    ${b.status === 'completed' ? '✅ 已完成' : '❌ 已取消'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <div id="contentShopping" style="display: none;">
                ${mySales.length === 0 ? `
                    <div class="text-center py-10 opacity-50"><p>暂无购物记录</p></div>
                ` : `
                    <div class="space-y-4">
                        ${mySales.map(s => `
                            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                                <div class="absolute top-0 right-0 bg-blue-50 text-blue-600 px-3 py-1 rounded-bl-lg text-xs font-bold">
                                    ${s.method || 'Cash'}
                                </div>
                                <div class="text-xs text-gray-400 mb-2">${s.date} ${s.time || ''}</div>
                                <div class="border-b border-dashed border-gray-200 pb-2 mb-2">
                                    ${s.items.map(item => `
                                        <div class="flex justify-between text-sm mb-1">
                                            <span>${item.name}</span>
                                            <span class="font-mono">RM ${item.price}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="flex justify-between font-bold text-gray-800">
                                    <span>总计 (Total)</span>
                                    <span>RM ${s.amount.toFixed(2)}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

// ==========================================
// 👇 图片上传通用工具函数 (放在文件最末尾)
// ==========================================
function handleImageUpload(event, imgId, placeholderId, inputId) {
    const file = event.target.files[0];
    if (!file) return;

    // 这里复用你之前有的 compressImage 函数
    // 如果没有 compressImage，就用简单的 FileReader
    if (typeof compressImage === 'function') {
        showToast('📷 处理图片中...');
        compressImage(file, 800, 0.7).then(dataUrl => {
            document.getElementById(inputId).value = dataUrl;
            const img = document.getElementById(imgId);
            const ph = document.getElementById(placeholderId);
            if (img) { img.src = dataUrl; img.style.display = 'block'; }
            if (ph) { ph.style.display = 'none'; }
            showToast('✅ 图片已就绪');
        });
    } else {
        // 后备方案 (如果没有压缩功能)
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            document.getElementById(inputId).value = dataUrl;
            const img = document.getElementById(imgId);
            const ph = document.getElementById(placeholderId);
            if (img) { img.src = dataUrl; img.style.display = 'block'; }
            if (ph) { ph.style.display = 'none'; }
        };
        reader.readAsDataURL(file);
    }
}

// ==========================================
// 👇 v1.1.0 新增：手机号清洗工具 (601xxxx)
// ==========================================
function cleanPhoneNumber(phone) {
    if (!phone) return '';
    // 1. 去掉所有非数字字符 (空格、横杠、括号)
    let cleaned = phone.replace(/\D/g, '');
    
    // 2. 如果是 01 开头，替换为 601
    if (cleaned.startsWith('01')) {
        cleaned = '6' + cleaned;
    }
    
    // 3. 如果没带 60，且是 1 开头，补上 60 (防呆)
    if (cleaned.startsWith('1')) {
        cleaned = '60' + cleaned;
    }

    return cleaned;
}

// ==========================================
// 👇 v1.1.0 核心：粉色入场券弹窗 (Pink Ticket)
// ==========================================
function showTicketModal(config, booking) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-[60] p-4';
    modal.style.background = 'rgba(0,0,0,0.85)';
    
    // 👇 使用刚才生成的单号，如果没有就显示一个临时的
    const displayNo = booking.receiptNumber || ('MY-' + booking.id.slice(-6));

    modal.innerHTML = `
        <div class="animate-fade-in-up w-full max-w-sm relative">
            
            <div id="ticketNode" style="background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(244, 114, 182, 0.4); position: relative;">
                
                <div style="background: linear-gradient(135deg, ${config.primary_action_color}, ${config.secondary_action_color}); padding: 24px; text-align: center; color: white; position: relative;">
                    <div style="font-size: 12px; letter-spacing: 2px; opacity: 0.8; margin-bottom: 4px;">OFFICIAL TICKET</div>
                    <h2 style="font-size: 24px; font-weight: 800; font-family: 'Playfair Display', serif;">${config.app_title}</h2>
                    <div style="font-size: 12px; opacity: 0.9;">ADMIT ONE</div>

                    <div style="position: absolute; bottom: -12px; left: -12px; width: 24px; height: 24px; background: rgba(0,0,0,0.85); border-radius: 50%;"></div>
                    <div style="position: absolute; bottom: -12px; right: -12px; width: 24px; height: 24px; background: rgba(0,0,0,0.85); border-radius: 50%;"></div>
                </div>

                <div style="padding: 32px 24px; position: relative; background: #fff;">
                    <div style="position: absolute; top: 0; left: 20px; right: 20px; border-top: 2px dashed #eee;"></div>

                    <div class="text-center mb-6">
                        <div style="font-size: 14px; color: #9ca3af; margin-bottom: 4px;">SERVICE</div>
                        <div style="font-size: 20px; font-weight: 700; color: ${config.text_color};">${booking.serviceName}</div>
                    </div>

                    <div class="flex justify-between mb-6">
                        <div class="text-center">
                            <div style="font-size: 10px; color: #9ca3af; letter-spacing: 1px;">DATE</div>
                            <div style="font-size: 16px; font-weight: 700;">${booking.appointmentDate}</div>
                        </div>
                        <div class="text-center">
                            <div style="font-size: 10px; color: #9ca3af; letter-spacing: 1px;">TIME</div>
                            <div style="font-size: 16px; font-weight: 700;">${booking.appointmentTime}</div>
                        </div>
                    </div>
                    
                    <div class="text-center mb-6 p-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <div style="font-size: 10px; color: #9ca3af; letter-spacing: 1px;">RECEIPT NO</div>
                        <div style="font-size: 18px; font-weight: 700; color: ${config.primary_action_color}; font-family: monospace;">${displayNo}</div>
                    </div>

                    <div class="text-center mb-6">
                        <div style="font-size: 10px; color: #9ca3af; letter-spacing: 1px;">GUEST</div>
                        <div style="font-size: 18px; font-weight: 700;">${booking.customerName}</div>
                    </div>

                    <div class="flex flex-col items-center justify-center opacity-80">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${displayNo}" style="width: 80px; height: 80px; margin-bottom: 8px;">
                        </div>
                </div>
            </div>

            <div class="mt-6 flex flex-col gap-3">
                <button id="saveTicketBtn" class="w-full py-3 rounded-xl font-bold text-white shadow-lg text-sm bg-pink-500 hover:bg-pink-600 transition-all">
                    📸 保存到相册 (Screenshot)
                </button>
                <button id="closeTicketBtn" class="w-full py-3 rounded-xl font-bold text-white border border-white/30 hover:bg-white/10 transition-all text-sm">
                    关闭
                </button>
            </div>
            
            <p class="text-center text-white/50 text-xs mt-4">请截图保存凭证，凭此单号核销</p>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('closeTicketBtn').addEventListener('click', () => {
        modal.remove();
        renderApp();
    });

    document.getElementById('saveTicketBtn').addEventListener('click', () => {
        const btn = document.getElementById('saveTicketBtn');
        const originalText = btn.innerText;
        btn.innerText = "⏳ 生成中...";
        
        if (typeof html2canvas !== 'undefined') {
            html2canvas(document.getElementById('ticketNode'), {
                backgroundColor: null,
                scale: 2
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `Ticket_${displayNo}.png`;
                link.href = canvas.toDataURL();
                link.click();
                btn.innerText = "✅ 已保存!";
                setTimeout(() => btn.innerText = originalText, 2000);
            });
        } else {
            alert("请直接使用手机截图功能保存哦！📸");
            btn.innerText = originalText;
        }
    });
}

// ==========================================
// 👇 v1.1.1 新增：生成收据单号 (MY-YYMM0001)
// ==========================================
function generateReceiptNumber() {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2); // 25
    const mm = (now.getMonth() + 1).toString().padStart(2, '0'); // 01
    const prefix = `MY-${yy}${mm}`;
    
    // 算出这个月已经开了多少单，然后 +1
    // 注意：这里我们算的是所有 Booking，不管状态是 pending 还是 completed，只要占了坑就算一单
    const bookings = getDataByType('booking');
    const monthlyCount = bookings.filter(b => b.receiptNumber && b.receiptNumber.startsWith(prefix)).length;
    
    const seq = (monthlyCount + 1).toString().padStart(4, '0'); // 0001
    return `${prefix}${seq}`;
}

// ==========================================
// 👇 V1.2.X 新增：订单管理助手 (调数量/扣库存)
// ==========================================

// 1. 调整订单里的数量
window.adjustOrderQty = async (orderId, itemIndex, change) => {
    const orders = getDataByType('order');
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const item = order.items[itemIndex];
    const newQty = item.quantity + change;

    // 只能减到 1，不能减没 (要没就直接取消订单)
    if (newQty < 1) return;

    // 检查库存 (提示而已，还是允许改，因为还没扣)
    const products = getDataByType('product');
    const product = products.find(p => p.id === item.id);
    if (product) {
        if (newQty > product.stock) {
            showToast(`⚠️ 警告：${product.name} 库存仅剩 ${product.stock}`);
            // 这里我们允许他调大，但在点“完成”时会拦截
        }
    }

    // 更新数量
    item.quantity = newQty;
    
    // 重新计算总价
    const newTotal = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    
    await updateRecord(order, { 
        items: order.items,
        totalAmount: newTotal.toFixed(2)
    });
    
    renderApp(); // 刷新界面
};

// 2. 完成订单 (并扣库存)
window.completeOrderWithStock = async (orderId) => {
    const orders = getDataByType('order');
    const order = orders.find(o => o.id === orderId);
    const products = getDataByType('product');
    
    if (!order) return;

    // A. 检查库存
    for (const item of order.items) {
        const product = products.find(p => p.id === item.id);
        if (!product) continue;
        
        if (item.quantity > product.stock) {
            alert(`⛔ 无法完成！\n商品 [${item.name}] 库存不足。\n需要: ${item.quantity}\n当前: ${product.stock}\n\n请先点击 [-] 减少数量。`);
            return;
        }
    }

    // B. 扣减库存
    for (const item of order.items) {
        const product = products.find(p => p.id === item.id);
        if (product) {
            const newStock = product.stock - item.quantity;
            await updateRecord(product, { stock: newStock });
        }
    }

    // C. 更新订单状态
    await updateRecord(order, { status: 'completed' });
    
    showToast('✅ 订单已完成，库存已扣除');
    renderApp();
};

// 3. 取消订单 (如果之前是已完成，则要把库存加回去)
// 注意：目前的 cancelOrderBtn 还是原来的逻辑，建议也换成这个
// 在 attachEventListeners 里修改 cancelOrderBtn 的逻辑
function setupOrderListeners(config) {
    document.querySelectorAll('.cancelOrderBtn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const orders = getDataByType('order');
            const o = orders.find(i => i.id === btn.dataset.id);
            if (!o) return;

            showConfirmModal(config, "确定取消这个订单吗？", async () => {
                // 如果是“已完成”的订单被取消，要把库存还回去
                if (o.status === 'completed') {
                    const products = getDataByType('product');
                    for (const item of o.items) {
                        const product = products.find(p => p.id === item.id);
                        if (product) {
                            await updateRecord(product, { stock: product.stock + item.quantity });
                        }
                    }
                    showToast('🔄 已撤销完成，库存已退回');
                }
                
                await updateRecord(o, { status: 'cancelled' });
                renderApp();
            });
        });
    });
}

// ==========================================
// 👇 V1.2.X 新增：展示 TNG 二维码大图
// ==========================================
function showQrPopup(qrUrl) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in';
    
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center relative transform scale-100 transition-transform">
            <h3 class="text-xl font-bold text-blue-600 mb-4 flex items-center justify-center gap-2">
                <span>🔵</span> 扫码支付 (Touch 'n Go)
            </h3>
            
            <div class="p-2 border-2 border-dashed border-blue-200 rounded-xl mb-4 inline-block bg-blue-50">
                <img src="${qrUrl}" class="w-64 h-64 object-cover rounded-lg shadow-sm">
            </div>
            
            <p class="text-gray-500 text-sm mb-6">请顾客使用 TNG eWallet 扫描</p>
            
            <button id="closeQrBtn" class="w-full py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                关闭 / 已支付
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 关闭事件
    const close = () => modal.remove();
    document.getElementById('closeQrBtn').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });
}

async function updateMyProfile(accountId) {
    const newPhone = document.getElementById('myPhone').value;
    const newPass = document.getElementById('newPassword').value;
    
    const accounts = getDataByType('customer_account');
    const myAccount = accounts.find(a => a.id === accountId);
    
    if (myAccount) {
        const updateData = { phone: cleanPhoneNumber(newPhone) };
        if (newPass) updateData.password = newPass;
        
        await updateRecord(myAccount, updateData);
        showToast('✅ 资料已更新');
    }
}

// ==========================================
// 👇 V1.2.1 核心：智能裁剪器 (支持 圆形/方形 切换)
// ==========================================
function openCropperModal(imageFile, callback, isRound = false) { // 👈 新增 isRound 参数
    if (!window.Cropper) {
        showToast('⏳ 裁剪组件正在加载，请稍后再试...');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const rawImgSrc = e.target.result;
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[100] bg-black flex flex-col'; 
        
        // 👇 只有 isRound 为 true 时，才注入圆形 CSS
        if (isRound) {
            const style = document.createElement('style');
            style.innerHTML = `
                .cropper-view-box, .cropper-face {
                    border-radius: 50%;
                    outline: 0;
                    box-shadow: 0 0 0 50vw rgba(0, 0, 0, 0.8);
                    border: 2px solid rgba(255, 255, 255, 0.8);
                }
                .cropper-dashed, .cropper-point, .cropper-line { display: none !important; }
            `;
            modal.appendChild(style);
        }

        modal.innerHTML += `
            <div class="flex-1 relative overflow-hidden bg-black p-4 flex items-center justify-center">
                <img id="cropperImage" src="${rawImgSrc}" style="max-width: 100%; max-height: 80vh; display: block;">
            </div>
            
            <div class="p-4 bg-gray-900 flex justify-between items-center gap-4 safe-area-bottom">
                <button id="cancelCropBtn" class="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                    取消
                </button>
                <div class="text-white text-xs opacity-50 font-mono">
                    ${isRound ? '圆形构图 (头像/Logo)' : '正方形构图 (1:1)'}
                </div>
                <button id="confirmCropBtn" class="px-8 py-3 rounded-xl font-bold text-black shadow-lg transform active:scale-95 transition-all" 
                    style="background: #ffffff;">
                    ✅ 确认使用
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        const imageElement = document.getElementById('cropperImage');
        const cropper = new Cropper(imageElement, {
            aspectRatio: 1, // 始终保持 1:1 比例
            viewMode: 1,    
            dragMode: 'move',
            autoCropArea: 0.8,
            restore: false, guides: !isRound, // 方形时显示辅助线，圆形隐藏
            center: true, highlight: false,
            cropBoxMovable: false, cropBoxResizable: false, toggleDragModeOnDblclick: false,
        });

        document.getElementById('cancelCropBtn').addEventListener('click', () => modal.remove());

        document.getElementById('confirmCropBtn').addEventListener('click', () => {
            const btn = document.getElementById('confirmCropBtn');
            btn.innerText = '处理中...';
            
            const canvas = cropper.getCroppedCanvas({
                width: 800, height: 800,
                imageSmoothingEnabled: true, imageSmoothingQuality: 'high',
            });

            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85); 
            callback(croppedDataUrl);
            modal.remove();
        });
    };
    reader.readAsDataURL(imageFile);
}

// 辅助函数：Logo上传专用
function handleFileWithCrop(file, inputId, previewId, placeholderId, isRound = false) {
    if (!file) return;
    // 👇 把 isRound 传进去
    openCropperModal(file, (croppedBase64) => {
        const input = document.getElementById(inputId);
        const img = document.getElementById(previewId);
        const ph = document.getElementById(placeholderId);
        
        if (input) input.value = croppedBase64;
        if (img) { img.src = croppedBase64; img.style.display = 'block'; }
        if (ph) { ph.style.display = 'none'; }
        
        const uploadText = img?.parentElement?.querySelector('p');
        if (uploadText) uploadText.style.display = 'none';

        showToast('✅ 图片裁剪成功！');
    }, isRound);
}

// ==========================================
// 👇 V1.2.0 新增：更新日志系统 (Changelog)
// ==========================================
const appChangelog = [
    {
        version: "v1.3.1-2",
        date: "2026-01-02",
        title: "🛡️ 安全与移动版 (Secure & Mobile)",
        features: [
            "📱 <b>收银台双屏模式</b>：手机端新增 [选购/结算] 切换标签，告别拥挤。",
            "📜 <b>自定义条款</b>：老板现在可以在设置里修改服务条款、隐私政策和退款规则。",
            "💾 <b>数据灾备修复</b>：优化 JSON 备份逻辑，修复恢复数据时的 Key 匹配问题。",
            "🖨️ <b>优雅打印</b>：打印报表时自动隐藏无关按钮，只保留核心数据卡片。"
        ]
    },
    {
        version: "v1.3.0",
        date: "2025-12-31",
        title: "🚀 智能商业版 (Smart Business)",
        features: [
            "💰 <b>智能收银台</b>：支持关联库存商品、自动扣减库存、灵活改价。",
            "🔗 <b>全渠道同步</b>：收银时自动合并顾客的“购物车”和“待处理订单”。",
            "📦 <b>进销存管理</b>：商品支持录入库存，缺货时自动拦截交易。",
            "📱 <b>扫码支付</b>：选择 TNG 支付时，自动弹出收款二维码大图。"
        ]
    },
    {
        version: "v1.2.0",
        date: "2025-12-31",
        title: "🎨 视觉进化版 (Visual Pro)",
        features: [
            "📸 <b>高级图片裁剪</b>：上传头像/Logo时支持拖拽裁剪，从此告别图片变形！",
            "⚫ <b>智能构图</b>：头像和Logo自动开启圆形取景框，商品图保持正方形。",
            "💅 <b>极致圆角</b>：登录页和顶部菜单的 Logo 全面升级为满屏圆形设计。",
            "🚀 <b>性能优化</b>：图片上传自动压缩，系统运行更流畅。"
        ]
    },
    {
        version: "v1.1.2",
        date: "2025-12-30",
        title: "🛡️ 体验优化版",
        features: [
            "📊 <b>智能排序</b>：全部预约里“急件置顶”，历史记录按“最近发生”排序。",
            "💊 <b>后悔药升级</b>：误点“取消预约”？30分钟内可以撤回了！",
            "📱 <b>电话管理</b>：现在注册、个人中心和后台都能修改手机号。",
            "🚫 <b>防误触</b>：已取消的订单会自动隐藏收银按钮。"
        ]
    },
    {
        version: "v1.1.1",
        date: "2025-12-29",
        title: "🎫 粉色门票 & 单号系统",
        features: [
            "🔢 <b>流水单号</b>：引入 MY-2501xxxx 格式的专业单号。",
            "🎟️ <b>粉色入场券</b>：预约成功弹出精美票据，支持截图保存。",
            "🕵️ <b>审计增强</b>：统计报表支持搜索单号，并显示精确完成时间。",
            "💾 <b>设置吸附</b>：设置页保存按钮固定在底部，操作更方便。"
        ]
    },
    {
        version: "v1.0.0",
        date: "2025-12-01",
        title: "🚀 初始发布",
        features: [
            "基础预约功能上线",
            "支持 TNG/Cash 收银",
            "商品库存管理",
            "WhatsApp 通知集成"
        ]
    }
];

function showChangelogModal(config, viewMode = 'latest') {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-[100] p-4';
    modal.style.background = 'rgba(0,0,0,0.6)'; // 半透明黑底
    
    let contentHtml = '';
    
    if (viewMode === 'latest') {
        // --- 显示最新版本 ---
        const latest = appChangelog[0];
        contentHtml = `
            <div class="text-center mb-6">
                <div class="inline-block px-3 py-1 rounded-full bg-pink-100 text-pink-600 text-xs font-bold mb-2">LATEST UPDATE</div>
                <h3 class="text-2xl font-bold" style="color: ${config.primary_action_color};">${latest.version}</h3>
                <p class="text-sm text-gray-400 font-mono">${latest.date}</p>
                <h4 class="text-lg font-bold mt-2">${latest.title}</h4>
            </div>
            
            <div class="bg-gray-50 rounded-xl p-5 mb-6 text-left border border-gray-100">
                <ul class="space-y-3">
                    ${latest.features.map(f => `<li class="flex items-start gap-2 text-sm text-gray-700"><span class="mt-1">✨</span> <span>${f}</span></li>`).join('')}
                </ul>
            </div>

            <div class="flex flex-col gap-3">
                <button id="closeChangelogBtn" class="w-full py-3 rounded-xl font-bold text-white shadow-md" 
                    style="background: ${config.primary_action_color};">
                    太棒了！(Got it)
                </button>
                <button id="viewHistoryBtn" class="text-sm text-gray-400 hover:text-gray-600 underline">
                    查看历史版本 (History)
                </button>
            </div>
        `;
    } else {
        // --- 显示历史列表 ---
        contentHtml = `
            <div class="text-center mb-4 border-b pb-4">
                <h3 class="text-xl font-bold" style="color: ${config.primary_action_color};">📜 版本历史</h3>
            </div>
            
            <div class="overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar text-left space-y-6">
                ${appChangelog.map((log, index) => `
                    <div class="relative pl-4 border-l-2 ${index === 0 ? 'border-pink-500' : 'border-gray-200'}">
                        <div class="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-pink-500' : 'bg-gray-300'}"></div>
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-bold text-gray-800">${log.version}</span>
                            <span class="text-xs text-gray-400 font-mono">${log.date}</span>
                        </div>
                        <div class="text-xs font-bold text-gray-500 mb-2">${log.title}</div>
                        <ul class="space-y-1">
                            ${log.features.map(f => `<li class="text-xs text-gray-600 leading-relaxed">• ${f}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>

            <div class="mt-6 pt-4 border-t">
                <button id="closeChangelogBtn" class="w-full py-3 rounded-xl font-bold border-2 text-gray-500 hover:bg-gray-50">
                    关闭
                </button>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="animate-fade-in-up bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 border-4" 
             style="border-color: ${config.primary_action_color};">
            ${contentHtml}
        </div>
    `;

    document.body.appendChild(modal);

    // 绑定事件
    document.getElementById('closeChangelogBtn').addEventListener('click', () => modal.remove());
    
    // 切换到历史记录
    const historyBtn = document.getElementById('viewHistoryBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            modal.remove(); // 先关掉当前的
            showChangelogModal(config, 'history'); // 再开个历史模式的
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ==========================================
// 👇 V1.2.0 新增：版本号点击处理 (消除红点)
// ==========================================
function handleVersionClick(config, version) {
    // 1. 打开更新日志
    showChangelogModal(config);
    
    // 2. 记录“已读”状态到本地存储
    localStorage.setItem('gembrow_last_seen_version', version);
    
    // 3. 视觉上立刻隐藏红点 (无需刷新)
    const badge = document.getElementById('versionBadge');
    if (badge) badge.remove();
}

initApp();
initGlobalWidgets();

//Gem Brow beauty [v1.3.1]