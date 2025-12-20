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
    const result = await window.dataSdk.create({
        ...record,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
    });
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
        tiktok_link: ''
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
// 👇 最终版：极简卡片风 + 右上角神秘按钮
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
    const logoContent = settings.logo_url 
        ? `<img src="${settings.logo_url}" class="w-full h-full object-contain filter drop-shadow-md">` 
        : `<span class="text-5xl">💎</span>`;

    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center p-6" style="${bgStyle}">
            <div class="max-w-md w-full">
                
                <div class="text-center mb-8 animate-fade-in-down">
                    <div class="w-28 h-28 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg mb-6 transform hover:rotate-12 transition-transform duration-300 overflow-hidden p-2">
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
                                <input type="text" id="regUsername" required class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-700">
                            </div>
                            <div>
                                <label class="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">邮箱</label>
                                <input type="email" id="regEmail" required class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-700">
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
            const success = await handleRegister(
                document.getElementById('regUsername').value,
                document.getElementById('regPassword').value,
                document.getElementById('regEmail').value
            );
            if(success) location.reload();
        });
        
        // 👇 关键：分别为三个链接绑定事件
        document.getElementById('regLinkTerms').addEventListener('click', (e) => {
            e.preventDefault(); // 防止勾选框被触发
            showPolicyModal(config, 'terms');
        });
        document.getElementById('regLinkPrivacy').addEventListener('click', (e) => {
            e.preventDefault();
            showPolicyModal(config, 'privacy');
        });
        document.getElementById('regLinkReturn').addEventListener('click', (e) => {
            e.preventDefault();
            showPolicyModal(config, 'return_policy');
        });

        document.getElementById('showLoginBtn').addEventListener('click', () => { showRegisterForm = false; renderApp(); });
    } else {
        // 登录逻辑保持不变
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
// 👇 主程序
// ==========================================
function renderMainApp(app, config, services, bookings, posts, customers) {
    const currentYear = new Date().getFullYear();
    const settings = getDiscountSettings();
    app.innerHTML = `
        <div class="min-h-full">
            <header style="background: rgba(255, 255, 255, 0.95); box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 40; border-bottom: 3px solid ${config.primary_action_color};">
                <div class="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center">
                    <img src="${settings.logo_url || './assets/header_logo.png'}" alt="${config.app_title}" class="header-logo-img" style="height: 40px; object-fit: contain;">
                    <button id="menuBtn" class="px-4 py-2 rounded-lg" style="border: 2px solid ${config.primary_action_color}; background: ${config.primary_action_color}22; color: ${config.primary_action_color}; font-family: Lato, sans-serif;">
                        ☰ 菜单
                    </button>
                </div>
            </header>
                    
            ${showMenu ? `
                <div id="menuOverlay" class="modal-backdrop fixed inset-0 z-50 flex items-end justify-end p-4">
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
                                <button id="viewMyBookings" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'mybookings' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">📅 我的预约</button>
                                <button id="viewProfile" class="w-full text-left px-4 py-3 rounded-lg mb-4" style="font-family: Lato, sans-serif; background: ${currentView === 'profile' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">👤 我的账户</button>
                            ` : ''}
                        `}
                        <button class="logout-btn w-full px-4 py-3 rounded-lg" style="font-family: Lato, sans-serif; background: ${config.secondary_action_color}; color: #ffffff;">
                            ${loggedInCustomerName || currentMode === 'owner' ? '退出登录' : '返回首页'}
                        </button>
                    </div>
                </div>
            ` : ''}
            
            <main class="max-w-7xl mx-auto px-6 py-8">
                ${currentMode === 'owner' ? renderOwnerView(config, services, bookings, posts, customers) : renderCustomerView(config, services, bookings, posts)}
            </main>

            <footer class="mt-auto py-12 text-center border-t border-gray-100" style="background: #fafafa; color: ${config.text_color};">
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
    const filteredBookings = bookings.filter(b => {
        if (filterStatus === 'all') return true;
        return b.status === filterStatus;
    }).filter(b => {
        if (!searchQuery) return true;
        return b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.customerPhone.includes(searchQuery) ||
            b.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    });
    
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
                            ${filteredBookings.map(booking => `
                                <div style="background: rgba(255, 255, 255, 0.95); padding: 20px; border-radius: 12px; border-left: 4px solid ${booking.status === 'pending' ? config.secondary_action_color : '#e5e7eb'}; shadow-sm transition-all hover:shadow-md">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <h3 style="font-weight: 700; color: ${config.text_color};">${booking.customerName}</h3>
                                            <p class="text-sm opacity-80">📞 ${booking.customerPhone}</p>
                                            <p class="font-bold mt-1" style="color: ${config.primary_action_color};">💅 ${booking.serviceName}</p>
                                            <p class="text-sm mt-1">📅 ${booking.appointmentDate} ${booking.appointmentTime}</p>
                                        </div>
                                        
                                        <div class="flex flex-col gap-2 items-end">
                                            <span style="font-size: 12px; padding: 2px 8px; rounded-full bg-gray-100">
                                                ${booking.status === 'pending' ? '待确认' : booking.status === 'completed' ? '已完成' : '已取消'}
                                            </span>
                                            ${booking.status === 'pending' ? `
                                                <div class="flex gap-1 mt-2">
                                                    <button class="completeBookingBtn" data-id="${booking.id}" style="background: #10b981; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px;">完成</button>
                                                    <button class="cancelBookingBtn" data-id="${booking.id}" style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px;">取消</button>
                                                </div>
                                            ` : `
                                                <div class="mt-2">
                                                    <button class="revertBookingBtn" data-id="${booking.id}" style="border: 1px solid #9ca3af; color: #4b5563; padding: 4px 8px; border-radius: 6px; font-size: 12px; background: white;">
                                                        ↩️ 恢复待办
                                                    </button>
                                                </div>
                                            `}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
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
                                        ${order.items.map(item => `
                                            <div class="flex justify-between mb-1">
                                                <span>${item.name} x${item.quantity}</span>
                                                <span>RM${(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        `).join('')}
                                        <div class="border-t pt-1 mt-1 flex justify-between font-bold">
                                            <span>Total</span>
                                            <span>RM${order.totalAmount}</span>
                                        </div>
                                    </div>

                                    ${order.status === 'pending' ? `
                                        <div class="flex gap-2">
                                            <button class="completeOrderBtn flex-1 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity" 
                                                data-id="${order.id}"
                                                style="background: #10b981; color: white;">
                                                ✅ 发货/完成
                                            </button>
                                            <button class="cancelOrderBtn flex-1 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity" 
                                                data-id="${order.id}"
                                                style="background: #ef4444; color: white;">
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
                    <h3 class="font-bold text-lg">商品库存配置</h3>
                    <button id="addProductBtn" class="px-4 py-2 rounded bg-gray-800 text-white text-sm">+ 上架商品</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${products.map(product => `
                        <div class="bg-white p-4 rounded-lg flex justify-between items-center shadow-sm">
                            <div class="flex gap-3 items-center">
                                <img src="${product.imageUrl || './assets/default_eye.png'}" class="w-12 h-12 rounded object-cover bg-gray-100">
                                <div>
                                    <div class="font-bold">${product.name}</div>
                                    <div class="text-sm text-gray-500">RM${product.price}</div>
                                </div>
                            </div>
                            <div class="space-x-2">
                                <button class="editProductBtn text-blue-500 text-sm" data-id="${product.id}">编辑</button>
                                <button class="deleteProductBtn text-red-500 text-sm" data-id="${product.id}">删除</button>
                            </div>
                        </div>
                    `).join('')}
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

function renderStats(config, services, bookings, customers, orders) {
    // 1. 如果 orders 没传进来（兼容旧代码），自己去取
    const safeOrders = orders || getDataByType('order');
    const safeBookings = bookings || [];
    
    // 2. 日期过滤辅助函数
    const isWithinDateRange = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr).toISOString().split('T')[0];
        return d >= statsStartDate && d <= statsEndDate;
    };

    // 3. 过滤数据 (优先使用 completedAt 实际完成时间)
    const filteredBookings = safeBookings.filter(b => {
        // 如果有实际完成时间，就用它；否则用预约时间作为保底
        const effectiveDate = b.completedAt || b.appointmentDate;
        // 确保 effectiveDate 也是按照 YYYY-MM-DD 格式比较
        return b.status === 'completed' && isWithinDateRange(effectiveDate);
    });
    const filteredOrders = safeOrders.filter(o => o.status === 'completed' && isWithinDateRange(o.createdAt));
    
    // 4. 计算收入
    const serviceRevenue = filteredBookings.reduce((sum, b) => sum + (parseFloat(b.totalAmount) || 0), 0);
    const productRevenue = filteredOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);
    const totalRevenue = serviceRevenue + productRevenue;

    // 5. 统计商品销量 (Product Sales Stats)
    const productStats = {}; // { '睫毛液': { quantity: 5, revenue: 100 } }
    
    filteredOrders.forEach(order => {
        order.items.forEach(item => {
            if (!productStats[item.name]) {
                productStats[item.name] = { quantity: 0, revenue: 0 };
            }
            productStats[item.name].quantity += item.quantity;
            productStats[item.name].revenue += (item.price * item.quantity);
        });
    });
    
    // 转成数组并排序
    const sortedProducts = Object.entries(productStats)
        .map(([name, stat]) => ({ name, ...stat }))
        .sort((a, b) => b.revenue - a.revenue); // 按销售额排序

    // 6. 渲染页面
    return `
        <div class="min-h-full">
            <header class="bg-white shadow-sm sticky top-0 z-10 border-b-2" style="border-color: ${config.primary_action_color};">
                <div class="max-w-7xl mx-auto px-4 py-4">
                    <div class="flex justify-between items-center mb-4">
                        <h1 class="text-xl font-bold" style="color: ${config.text_color};">📊 数据统计</h1>
                        <div class="flex gap-2">
                            <button onclick="window.print()" class="px-4 py-2 rounded-lg text-white text-sm font-bold shadow-md" style="background-color: ${config.secondary_action_color};">
                                🖨️ 导出
                            </button>
                            <button onclick="currentView='manage'; renderApp()" class="px-4 py-2 rounded-lg border-2 text-sm font-bold" style="border-color: ${config.primary_action_color}; color: ${config.primary_action_color};">
                                返回
                            </button>
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-4 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">开始日期</label>
                            <input type="date" id="statsStartInput" value="${statsStartDate}" 
                                class="px-3 py-2 rounded border border-gray-300 text-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 mb-1">结束日期</label>
                            <input type="date" id="statsEndInput" value="${statsEndDate}" 
                                class="px-3 py-2 rounded border border-gray-300 text-sm">
                        </div>
                        <button onclick="statsStartDate = document.getElementById('statsStartInput').value; statsEndDate = document.getElementById('statsEndInput').value; renderApp()" 
                            class="px-6 py-2 rounded text-white font-bold text-sm shadow-sm hover:opacity-90"
                            style="background: ${config.primary_action_color};">
                            🔍 查询
                        </button>
                    </div>
                </div>
            </header>

            <main class="max-w-7xl mx-auto px-4 py-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white p-6 rounded-xl shadow-md border-l-4" style="border-color: ${config.primary_action_color};">
                        <p class="text-sm opacity-70 mb-1">总收入 (服务+商品)</p>
                        <h3 class="text-3xl font-bold" style="color: ${config.primary_action_color};">
                            RM${totalRevenue.toFixed(2)}
                        </h3>
                        <p class="text-xs text-gray-400 mt-2">
                            服务: ${serviceRevenue.toFixed(2)} | 商品: ${productRevenue.toFixed(2)}
                        </p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-md border-l-4" style="border-color: ${config.secondary_action_color};">
                        <p class="text-sm opacity-70 mb-1">商品成交量</p>
                        <h3 class="text-3xl font-bold" style="color: ${config.secondary_action_color};">
                            ${filteredOrders.length} 单
                        </h3>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-md border-l-4 border-gray-500">
                        <p class="text-sm opacity-70 mb-1">服务完成数</p>
                        <h3 class="text-3xl font-bold text-gray-700">
                            ${filteredBookings.length} 单
                        </h3>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-xl shadow-md mb-8">
                    <h3 class="text-lg font-bold mb-4 border-b pb-2">💆‍♀️ 服务预约记录 (${statsStartDate} 至 ${statsEndDate})</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="text-sm text-gray-500 border-b">
                                    <th class="py-2">日期</th>
                                    <th class="py-2">客户</th>
                                    <th class="py-2">项目</th>
                                    <th class="py-2 text-right">金额</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredBookings.length === 0 ? `
                                    <tr><td colspan="4" class="text-center py-4 text-gray-400">该时间段无服务记录</td></tr>
                                ` : filteredBookings
                                    .sort((a, b) => {
                                        // 排序也改成按“实际日期”排
                                        const dateA = a.completedAt || a.appointmentDate;
                                        const dateB = b.completedAt || b.appointmentDate;
                                        return new Date(dateB) - new Date(dateA);
                                    })
                                    .map(b => {
                                        // 👉 【核心修复】计算要显示的日期
                                        // 如果有实际完成时间，就切分出 YYYY-MM-DD；否则显示预约日期
                                        const displayDate = b.completedAt ? b.completedAt.split('T')[0] : b.appointmentDate;
                                        
                                        // 可选：如果是“实际完成”，可以加个小标记让账目更清楚
                                        const dateBadge = b.completedAt && b.completedAt.split('T')[0] !== b.appointmentDate 
                                            ? '<span style="font-size:10px; color:#ef4444;">(实)</span>' 
                                            : '';

                                        return `
                                        <tr class="border-b last:border-0 hover:bg-gray-50">
                                            <td class="py-3 text-sm">
                                                ${displayDate} ${dateBadge}
                                            </td>
                                            <td class="py-3 text-sm font-medium">${b.customerName}</td>
                                            <td class="py-3 text-sm text-gray-600">${b.serviceName}</td>
                                            <td class="py-3 text-sm font-bold text-right" style="color: ${config.primary_action_color};">
                                                RM${parseFloat(b.totalAmount).toFixed(2)}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-xl shadow-md">
                    <h3 class="text-lg font-bold mb-4 border-b pb-2">🛍️ 成交商品统计 (${statsStartDate} 至 ${statsEndDate})</h3>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="text-sm text-gray-500 border-b">
                                    <th class="py-2">商品名称</th>
                                    <th class="py-2 text-center">销量 (件)</th>
                                    <th class="py-2 text-right">总销售额</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedProducts.length === 0 ? `
                                    <tr><td colspan="3" class="text-center py-4 text-gray-400">该时间段无商品成交</td></tr>
                                ` : sortedProducts.map(p => `
                                    <tr class="border-b last:border-0 hover:bg-gray-50">
                                        <td class="py-3 text-sm font-medium">${p.name}</td>
                                        <td class="py-3 text-sm text-center bg-gray-50 rounded-lg font-bold text-gray-600">
                                            ${p.quantity}
                                        </td>
                                        <td class="py-3 text-sm font-bold text-right" style="color: ${config.secondary_action_color};">
                                            RM${p.revenue.toFixed(2)}
                                        </td>
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

function renderCustomersManagement(config, customers, bookings) {
    return `
                <div>
                    <div class="flex justify-between items-center mb-8">
                        <h2 style="font-size: ${config.font_size * 2}px; font-weight: 700; color: ${config.primary_action_color};">
                            客户管理
                        </h2>
                        <button id="addCustomerBtn" class="btn-primary px-6 py-3 rounded-lg" style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff;">
                            + 添加客户
                        </button>
                    </div>
                    
                    ${customers.length === 0 ? `
                        <div class="text-center py-16" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px;">
                            <div style="font-size: 60px;">👥</div>
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 1.1}px; color: ${config.text_color}; opacity: 0.6;">
                                暂无注册客户
                            </p>
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${customers.map(customer => {
        const customerBookings = bookings.filter(b => b.customerName === customer.username);
        const completedBookings = customerBookings.filter(b => b.status === 'completed');
        const discount = getMembershipDiscount(customer.membershipLevel);
        return `
                                    <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                        <div class="flex justify-between items-start mb-4">
                                            <h3 style="font-size: ${config.font_size * 1.3}px; font-weight: 700; color: ${config.text_color};">
                                                ${customer.username}
                                            </h3>
                                            ${getMembershipBadge(customer.membershipLevel, config)}
                                        </div>
                                        <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                                            📧 ${customer.email}
                                        </p>
                                        <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                                            ⭐ 积分: ${customer.points}
                                        </p>
                                        <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                                            🎁 折扣: ${getMembershipDiscountText(customer.membershipLevel)}
                                        </p>
                                        <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                                            📅 预约次数: ${customerBookings.length}
                                        </p>
                                        <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 12px;">
                                            ✅ 完成次数: ${completedBookings.length}
                                        </p>
                                        <div class="flex gap-2">
                                            <button class="editCustomerBtn flex-1 py-2 rounded-lg" data-customer-id="${customer.id}"
                                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 0.9}px;">
                                                ✏️ 编辑
                                            </button>
                                            <button class="deleteCustomerBtn py-2 px-4 rounded-lg" data-customer-id="${customer.id}"
                                                style="font-family: Lato, sans-serif; background: #ef4444; color: #ffffff; font-size: ${config.font_size * 0.9}px;">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                `;
    }).join('')}
                        </div>
                    `}
                </div>
            `;
}
// ==========================================
// 👇 设置页面 (加入商家信息、社交链接、备份按钮)
// ==========================================
function renderSettings(config) {
    const discountSettings = getDiscountSettings();
    
    // 获取当前管理员账号
    const owners = getDataByType('owner_credentials');
    const currentOwner = owners.length > 0 ? owners[0] : ownerCredentials;

    // 👇 【新增】这里是 Logo 上传的“幕后逻辑”
    // 我们用 setTimeout 确保 HTML 画出来之后，再给按钮加监听
    setTimeout(() => {
        const logoInput = document.getElementById('logoFileInput');
        const logoUrlInput = document.getElementById('shopLogo');
        
        if(logoInput && logoUrlInput) {
            logoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        showToast('正在处理图片...');
                        // 使用你刚才加的 compressImage 函数 (最大宽 300px 足够做 Logo 了)
                        const compressedBase64 = await compressImage(file, 300, 0.8);
                        
                        logoUrlInput.value = compressedBase64;
                        
                        // 马上更新预览图给老板看
                        const previewContainer = document.getElementById('logoPreviewBox');
                        if(previewContainer) {
                            previewContainer.innerHTML = `<img src="${compressedBase64}" class="w-full h-full object-contain">`;
                        }
                        showToast('Logo 已就绪，记得点底部保存！✅');
                    } catch (err) {
                        console.error(err);
                        showToast('❌ 图片处理失败');
                    }
                }
            });
        }
    }, 500); // 延迟 500ms 确保页面渲染完毕

    return `
        <div class="pb-20">
            <h2 style="font-size: ${config.font_size * 2}px; font-weight: 700; color: ${config.primary_action_color}; margin-bottom: 24px;">
                ⚙️ 系统设置
            </h2>
            
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
                    <p class="text-xs text-red-400 mt-2">* 修改后点击保存即刻生效，无需重新登录。</p>
                </div>

                <div class="mb-6 p-6 rounded-2xl bg-white shadow-sm">
                    <h3 class="mb-4 font-bold text-lg text-gray-800 border-b pb-2">🏢 店铺与商家信息</h3>
                    
                    <div class="mb-6 flex flex-col items-center p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <label class="mb-2 text-sm font-bold text-gray-600">店铺 Logo (点击上传)</label>
                        
                        <div id="logoPreviewBox" class="w-24 h-24 mb-3 bg-white rounded-full shadow-md flex items-center justify-center overflow-hidden border border-gray-100 cursor-pointer"
                             onclick="document.getElementById('logoFileInput').click()">
                            ${discountSettings.logo_url ? 
                                `<img src="${discountSettings.logo_url}" class="w-full h-full object-contain">` : 
                                `<span class="text-4xl">💎</span>`
                            }
                        </div>
                        
                        <input type="file" id="logoFileInput" accept="image/*" style="display: none;">
                        <input type="text" id="shopLogo" value="${discountSettings.logo_url || ''}" placeholder="Logo 数据 (自动生成)" readonly
                            class="w-full px-3 py-2 rounded border text-xs text-gray-400 bg-gray-100 focus:outline-none mb-2">
                        <p class="text-xs text-gray-400">点击上面的圆圈即可上传图片</p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="mb-2">
                            <label class="block mb-1 text-sm font-bold text-gray-600">店铺名称</label>
                            <input type="text" id="shopName" value="${discountSettings.shop_name || config.app_title}" 
                                class="w-full px-3 py-2 rounded border focus:outline-none focus:border-pink-500">
                        </div>
                        <div class="col-span-1 md:col-span-2 mb-4">
                            <label class="block mb-1 text-sm font-bold text-green-600">WhatsApp 联系号码 (不要加 + 号)</label>
                            <input type="text" inputmode="numeric" id="waNumber" value="${discountSettings.wa_number || '60123456789'}" placeholder="601xxxxxxx" oninput="this.value = this.value.replace(/[^0-9]/g, '')"
                                class="w-full px-3 py-2 rounded border border-green-200 focus:outline-none focus:border-green-500 bg-green-50">
                        </div>
                        <div class="mb-2">
                            <label class="block mb-1 text-sm font-bold text-gray-600">商业注册号 (SSM No.)</label>
                            <input type="text" id="ssmNumber" value="${discountSettings.ssm_number || ''}" placeholder="e.g. 202403XXXXXX"
                                class="w-full px-3 py-2 rounded border focus:outline-none focus:border-pink-500">
                        </div>
                        <div class="col-span-1 md:col-span-2 mb-2">
                            <label class="block mb-1 text-sm font-bold text-gray-600">店铺完整地址</label>
                            <input type="text" id="shopAddress" value="${discountSettings.shop_address || ''}" placeholder="输入店铺地址..."
                                class="w-full px-3 py-2 rounded border focus:outline-none focus:border-pink-500">
                        </div>
                        <div class="col-span-1 md:col-span-2 mb-2">
                            <label class="block mb-1 text-sm font-bold text-gray-600">导航链接 (Google Maps/Waze)</label>
                            <input type="text" id="mapLink" value="${discountSettings.map_link || ''}" placeholder="粘贴地图分享链接..."
                                class="w-full px-3 py-2 rounded border focus:outline-none focus:border-pink-500">
                        </div>
                    </div>

                    <h4 class="mt-6 mb-4 font-bold text-sm text-gray-500 uppercase tracking-wider">社交媒体链接</h4>
                    <div class="space-y-3">
                        <div class="flex items-center gap-3">
                            <span class="w-16 text-sm font-bold">FB</span>
                            <input type="text" id="fbLink" value="${discountSettings.fb_link || ''}" placeholder="Facebook Link" class="flex-1 px-3 py-2 rounded border">
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="w-16 text-sm font-bold">IG</span>
                            <input type="text" id="igLink" value="${discountSettings.ig_link || ''}" placeholder="Instagram Link" class="flex-1 px-3 py-2 rounded border">
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="w-16 text-sm font-bold">TikTok</span>
                            <input type="text" id="tiktokLink" value="${discountSettings.tiktok_link || ''}" placeholder="TikTok Link" class="flex-1 px-3 py-2 rounded border">
                        </div>
                    </div>
                </div>

                <div class="mb-6 p-6 rounded-2xl bg-white shadow-sm">
                    <h3 class="mb-4 font-bold text-lg text-gray-800 border-b pb-2">⚙️ 积分与规则</h3>
                    <div class="mb-4 flex items-center justify-between">
                        <span class="font-bold text-gray-700">启用积分功能</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="enableRewards" class="sr-only peer" ${discountSettings.enable_rewards !== false ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                        </label>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">消费多少积1分 (RM)</label>
                            <input type="number" id="rmToPointsRate" value="${discountSettings.rm_to_points_rate || 1}" min="1" 
                                class="w-full px-3 py-2 rounded border focus:outline-none focus:border-pink-500">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">多少积分抵扣 RM1</label>
                            <input type="number" id="pointsToRmRate" value="${discountSettings.points_to_rm_rate || 10}" min="1" 
                                class="w-full px-3 py-2 rounded border focus:outline-none focus:border-pink-500">
                        </div>
                    </div>
                </div>

                <div class="mb-6 p-6 rounded-2xl bg-white shadow-sm">
                    <h3 class="mb-4 font-bold text-lg text-gray-800 border-b pb-2">💎 会员折扣设置</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">铜牌折扣(%)</label>
                            <input type="number" id="bronzeDiscount" value="${discountSettings.bronze_discount || 0}" min="0" max="100" class="w-full px-3 py-2 rounded border">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">铜牌积分</label>
                            <input type="number" id="bronzePoints" value="${discountSettings.bronze_points || 0}" min="0" class="w-full px-3 py-2 rounded border">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">银牌折扣(%)</label>
                            <input type="number" id="silverDiscount" value="${discountSettings.silver_discount || 5}" min="0" max="100" class="w-full px-3 py-2 rounded border">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">银牌积分</label>
                            <input type="number" id="silverPoints" value="${discountSettings.silver_points || 100}" min="0" class="w-full px-3 py-2 rounded border">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">金牌折扣(%)</label>
                            <input type="number" id="goldDiscount" value="${discountSettings.gold_discount || 10}" min="0" max="100" class="w-full px-3 py-2 rounded border">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">金牌积分</label>
                            <input type="number" id="goldPoints" value="${discountSettings.gold_points || 300}" min="0" class="w-full px-3 py-2 rounded border">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">白金折扣(%)</label>
                            <input type="number" id="platinumDiscount" value="${discountSettings.platinum_discount || 15}" min="0" max="100" class="w-full px-3 py-2 rounded border">
                        </div>
                        <div>
                            <label class="block mb-1 text-sm font-bold text-gray-600">白金积分</label>
                            <input type="number" id="platinumPoints" value="${discountSettings.platinum_points || 600}" min="0" class="w-full px-3 py-2 rounded border">
                        </div>
                    </div>
                </div>

                <div class="mb-6 p-6 rounded-2xl bg-white shadow-sm">
                    <h3 class="mb-4 font-bold text-lg text-gray-800 border-b pb-2">🛒 商品功能</h3>
                    <div class="mb-4 flex items-center justify-between">
                        <span class="font-bold text-gray-700">启用商品销售功能</span>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="enableShop" class="sr-only peer" ${discountSettings.enable_shop !== false ? 'checked' : ''}>
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                        </label>
                    </div>
                </div>

                <button type="submit" class="w-full py-4 rounded-xl font-bold text-white shadow-lg mb-8 transform active:scale-95 transition-transform"
                    style="background: ${config.primary_action_color};">
                    保存所有设置
                </button>
            </form>

            <div class="mb-12 p-6 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300">
                <h3 class="mb-2 font-bold text-gray-700">💾 数据安全备份</h3>
                <div class="flex gap-4">
                    <button type="button" onclick="exportData()" class="flex-1 py-3 rounded-lg font-bold text-white bg-gray-600 hover:bg-gray-700 flex items-center justify-center gap-2">
                        <span>⬇️</span> 导出备份
                    </button>
                    <button type="button" onclick="document.getElementById('importFile').click()" class="flex-1 py-3 rounded-lg font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2">
                        <span>⬆️</span> 导入恢复
                    </button>
                    <input type="file" id="importFile" accept=".json" style="display: none;" onchange="importData(this)">
                </div>
            </div>
        </div>
    `;
}

function renderCustomerView(config, services, bookings, posts) {
    if (currentView === 'mybookings' && loggedInCustomerName) {
        return renderMyBookings(config, bookings);
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

function renderMyBookings(config, bookings) {
    // 1. 获取该顾客的订单
    const allOrders = getDataByType('order');
    const myOrders = allOrders.filter(o => o.customerName === loggedInCustomerName);
    
    // 2. 排序：最新的在上面
    const sortedBookings = bookings.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));
    const sortedOrders = myOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return `
        <div class="max-w-md mx-auto">
            <h2 class="text-2xl font-bold mb-6 text-center" style="color: ${config.primary_action_color};">
                👤 个人中心
            </h2>

            <div class="mb-8">
                <h3 class="text-lg font-bold mb-4 border-b pb-2 flex justify-between items-center">
                    <span>📅 我的预约记录</span>
                    <span class="text-sm bg-gray-100 px-2 py-1 rounded-full text-gray-500">${bookings.length}</span>
                </h3>

                ${bookings.length === 0 ? `
                    <p class="text-center text-gray-400 py-4">您还没有预约过服务哦</p>
                ` : `
                    <div class="space-y-4">
                        ${sortedBookings.map(booking => {
                            // 检查是否已评价
                            const hasRated = getDataByType('rating').some(r => r.bookingId === booking.id);
                            
                            return `
                            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="font-bold text-lg" style="color: ${config.primary_action_color};">${booking.serviceName}</h4>
                                    <span class="text-xs px-2 py-1 rounded-full ${
                                        booking.status === 'completed' ? 'bg-green-100 text-green-600' : 
                                        booking.status === 'cancelled' ? 'bg-red-100 text-red-600' : 
                                        'bg-yellow-100 text-yellow-600'
                                    }">
                                        ${booking.status === 'pending' ? '待确认' : booking.status === 'completed' ? '已完成' : '已取消'}
                                    </span>
                                </div>
                                <p class="text-gray-600 text-sm mb-1">📅 ${booking.appointmentDate} ${booking.appointmentTime}</p>
                                <p class="font-bold text-gray-800">RM${booking.totalAmount}</p>
                                
                                ${booking.status === 'pending' ? `
                                    <button class="cancelBookingBtn w-full mt-3 py-2 rounded-lg text-sm border border-red-200 text-red-500 hover:bg-red-50" data-id="${booking.id}">
                                        取消预约
                                    </button>
                                ` : ''}

                                ${booking.status === 'completed' && !hasRated ? `
                                    <button class="rateBookingBtn w-full mt-3 py-2 rounded-lg text-sm font-bold text-white shadow-sm hover:opacity-90" 
                                        data-id="${booking.id}"
                                        style="background: ${config.secondary_action_color};">
                                        ⭐ 去评价
                                    </button>
                                ` : ''}
                                
                                ${booking.status === 'completed' && hasRated ? `
                                    <div class="mt-3 text-center text-xs text-gray-400">已评价 ✅</div>
                                ` : ''}
                            </div>
                        `;
                        }).join('')}
                    </div>
                `}
            </div>

            <div class="mb-12">
                <h3 class="text-lg font-bold mb-4 border-b pb-2 flex justify-between items-center">
                    <span>📦 我的商品订单</span>
                    <span class="text-sm bg-gray-100 px-2 py-1 rounded-full text-gray-500">${myOrders.length}</span>
                </h3>

                ${myOrders.length === 0 ? `
                    <p class="text-center text-gray-400 py-4">您还没有购买过商品</p>
                ` : `
                    <div class="space-y-4">
                        ${sortedOrders.map(order => `
                            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div class="flex justify-between items-start mb-3">
                                    <span class="text-xs text-gray-400">
                                        ${new Date(order.createdAt).toLocaleString('zh-CN')}
                                    </span>
                                    <span class="text-xs px-2 py-1 rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}">
                                        ${order.status === 'completed' ? '已发货/完成' : '处理中'}
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
                                        <span style="color: ${config.secondary_action_color};">RM${order.totalAmount}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <button class="logout-btn w-full py-3 rounded-lg border-2 border-gray-300 text-gray-500 font-bold mb-8">
                退出登录
            </button>
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
    document.getElementById('viewProfile')?.addEventListener('click', () => {
        currentView = 'profile';
        showMenu = false;
        renderApp();
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
            if (b) showConfirmModal(config, "确定取消此预约？", async () => updateRecord(b, { status: 'cancelled' }));
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

    // === 7. 设置保存 ===
    document.getElementById('discountSettingsForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. 保存普通设置
        const currentSettings = getDataByType('discount_settings')[0] || {};
        const newSettings = {
            type: 'discount_settings',
            shop_name: document.getElementById('shopName').value.trim(),
            ssm_number: document.getElementById('ssmNumber').value.trim(),
            shop_address: document.getElementById('shopAddress').value.trim(),
            wa_number: document.getElementById('waNumber').value,
            logo_url: document.getElementById('shopLogo')?.value || '', 
            map_link: document.getElementById('mapLink').value.trim(),
            fb_link: document.getElementById('fbLink').value.trim(),
            ig_link: document.getElementById('igLink').value.trim(),
            tiktok_link: document.getElementById('tiktokLink').value.trim(),
            enable_rewards: document.getElementById('enableRewards').checked,
            enable_shop: document.getElementById('enableShop').checked,
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

        // 2. 保存管理员账号密码
        const newAdminUser = document.getElementById('adminUsername').value.trim();
        const newAdminPass = document.getElementById('adminPassword').value.trim();
        
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
        
        // 更新全局内存
        ownerCredentials = { username: newAdminUser, password: newAdminPass };
        allData = loadDb(); // 重新加载数据到内存

        // 3. 提示成功 & 刷新界面
        showToast('✅ 设置已保存！WhatsApp 按钮已更新。');
        
        renderApp();        // 刷新页面内容
        initGlobalWidgets(); // 👈【关键】强制重新生成右下角的按钮！
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

// Modal functions
function showAddCustomerModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
                <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <h3 class="mb-6" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                        添加新客户
                    </h3>
                    
                    <form id="addCustomerForm">
                        <div class="mb-4">
                            <label for="newCustomerUsername" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                用户名
                            </label>
                            <input type="text" id="newCustomerUsername" required
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-4">
                            <label for="newCustomerEmail" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                邮箱
                            </label>
                            <input type="email" id="newCustomerEmail" required
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-4">
                            <label for="newCustomerPassword" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                初始密码
                            </label>
                            <input type="password" id="newCustomerPassword" required
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-6">
                            <label for="newCustomerPoints" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                初始积分
                            </label>
                            <input type="number" id="newCustomerPoints" value="0" min="0"
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="flex gap-3">
                            <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                添加客户
                            </button>
                            <button type="button" id="cancelAddCustomerBtn" class="flex-1 py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">
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
        const points = parseInt(document.getElementById('newCustomerPoints').value);

        // Check if username already exists
        const existingCustomer = getDataByType('customer_account').find(c => c.username === username);
        if (existingCustomer) {
            showToast('用户名已存在');
            return;
        }

        const membershipLevel = calculateMembershipLevel(points);

        const success = await createRecord({
            type: 'customer_account',
            username: username,
            email: email,
            password: password,
            points: points,
            membershipLevel: membershipLevel
        });

        if (success) {
            modal.remove();
        }
    });

    document.getElementById('cancelAddCustomerBtn').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
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
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

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

function showBookingModal(config, serviceId, serviceName, servicePrice) {
    const customerAccount = loggedInCustomerName ?
        getDataByType('customer_account').find(acc => acc.username === loggedInCustomerName) : null;
    const availablePoints = customerAccount ? customerAccount.points : 0;
    const settings = getDiscountSettings();
    const pointsToRmRate = settings.points_to_rm_rate || 10;
    const showRewards = settings.enable_rewards !== false;

    const modal = document.createElement('div');
    // z-50 保证在最上层
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    // 👇【关键修复】注意 style 里的 max-height 和 overflow-y
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 85vh; overflow-y: auto;">
            <h3 class="mb-6 text-center" style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.primary_action_color};">
                预约 ${serviceName}
            </h3>
        
            <form id="bookingForm">
                <div class="mb-4">
                    <label for="customerName" class="block mb-1 font-bold text-sm">姓名</label>
                    <input type="text" id="customerName" required value="${loggedInCustomerName || ''}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                </div>
            
                <div class="mb-4">
                    <label for="customerPhone" class="block mb-1 font-bold text-sm">电话</label>
                    <input type="tel" id="customerPhone" required
                        class="w-full px-4 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                </div>
            
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="appointmentDate" class="block mb-1 font-bold text-sm">日期</label>
                        <input type="date" id="appointmentDate" required min="${new Date().toISOString().split('T')[0]}"
                            class="w-full px-3 py-3 rounded-lg border-2" style="border-color: ${config.text_color}33;">
                    </div>
                    <div>
                        <label for="appointmentTime" class="block mb-1 font-bold text-sm">时间</label>
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

    // === 下面是逻辑部分，保持原样即可 ===
    const pointsInput = document.getElementById('pointsToUse');
    if (pointsInput) {
        pointsInput.addEventListener('input', () => {
            const pointsUsed = parseInt(pointsInput.value) || 0;
            const pointsDiscount = (pointsUsed / pointsToRmRate).toFixed(2);
            const finalPrice = Math.max(0, parseFloat(servicePrice) - parseFloat(pointsDiscount)).toFixed(2);
            document.getElementById('pointsDiscount').textContent = `-RM${pointsDiscount}`;
            document.getElementById('finalPrice').textContent = `RM${finalPrice}`;
        });
        const useMaxPointsBtn = document.getElementById('useMaxPointsBtn');
        if (useMaxPointsBtn) {
            useMaxPointsBtn.addEventListener('click', () => {
                const maxPointsByPrice = Math.floor(parseFloat(servicePrice) * pointsToRmRate);
                const maxPoints = Math.min(availablePoints, maxPointsByPrice);
                pointsInput.value = maxPoints;
                pointsInput.dispatchEvent(new Event('input'));
            });
        }
    }

    document.getElementById('bookingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const targetDate = document.getElementById('appointmentDate').value;
        const targetTime = document.getElementById('appointmentTime').value;
        
        // 简单的防冲突检查
        const existingBookings = getDataByType('booking');
        const hasConflict = existingBookings.some(b =>
            b.appointmentDate === targetDate && b.appointmentTime === targetTime && b.status !== 'cancelled'
        );

        if (hasConflict) {
            showToast('❌ 该时间段已有预约');
            return;
        }

        const pointsUsed = (customerAccount && showRewards) ? (parseInt(document.getElementById('pointsToUse')?.value) || 0) : 0;
        const finalPrice = Math.max(0, parseFloat(servicePrice) - (pointsUsed / pointsToRmRate));

        if (customerAccount && pointsUsed > availablePoints) {
            showToast('积分不足');
            return;
        }

        const success = await createRecord({
            type: 'booking',
            customerName: document.getElementById('customerName').value,
            customerPhone: document.getElementById('customerPhone').value,
            serviceId: serviceId,
            serviceName: serviceName,
            appointmentDate: targetDate,
            appointmentTime: targetTime,
            status: 'pending',
            totalAmount: parseFloat(finalPrice.toFixed(2)),
            points_used: pointsUsed
        });

        if (success) {
            if (customerAccount && pointsUsed > 0) {
                await updateRecord(customerAccount, { points: customerAccount.points - pointsUsed });
            }
            modal.remove();
        }
    });

    document.getElementById('cancelBookingBtn').addEventListener('click', () => modal.remove());
    // 点击背景关闭
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
    
    // 获取当前的等级，如果没有就默认 bronze
    const currentLevel = customer.membershipLevel || 'bronze';

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border-2" style="border-color: ${config.primary_action_color};">
            <div class="p-6 text-center text-white" style="background: ${config.primary_action_color};">
                <h3 class="text-xl font-bold">编辑客户资料</h3>
                <p class="text-sm opacity-80">${customer.username}</p>
            </div>
            
            <form id="editCustomerForm" class="p-6">
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

    // 绑定事件
    document.getElementById('cancelEditBtn').addEventListener('click', () => modal.remove());
    
    document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updates = {
            email: document.getElementById('editEmail').value,
            points: parseInt(document.getElementById('editPoints').value),
            membershipLevel: document.getElementById('editMembership').value // 这里的 value 是 bronze/silver...
        };

        // 获取新密码逻辑
        const newPass = document.getElementById('resetPassword').value;
        if(newPass && newPass.trim() !== '') {
            updates.password = newPass.trim();
            showToast(`🔑 密码已重置为: ${updates.password}`);
        } else {
            showToast('✅ 资料已更新');
        }

        await updateRecord(customer, updates);
        modal.remove();
        renderApp(); // 刷新列表
    });

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
// ==========================================
// 👇 编辑个人资料 (加入头像上传功能)
// ==========================================
function showEditProfileModal(config, customer) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    // 默认头像
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

    // === 图片上传逻辑 ===
    const dropZone = document.getElementById('avatarDropZone');
    const fileInput = document.getElementById('avatarFileInput');
    const preview = document.getElementById('avatarPreview');
    const hiddenInput = document.getElementById('avatarBase64');

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => { // 👈 加 async
        const file = e.target.files[0];
        if (file) {
            try {
                // 👇 压缩头像：最大宽 300px，质量 0.7
                const compressedBase64 = await compressImage(file, 300, 0.7);
                preview.src = compressedBase64; 
                hiddenInput.value = compressedBase64; 
            } catch (err) {
                showToast('❌ 图片上传失败');
            }
        }
    });

    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const newUsername = document.getElementById('editProfileUsername').value.trim();
        const newEmail = document.getElementById('editProfileEmail').value.trim();
        const newPassword = document.getElementById('editProfilePassword').value;
        const newAvatar = document.getElementById('avatarBase64').value; // ✅ 获取新头像

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
            email: newEmail,
            avatarUrl: newAvatar // ✅ 保存头像
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

// === 条款弹窗 (Terms / Privacy / Cookies) ===
function showPolicyModal(config, type) {
    const policies = {
        terms: {
            title: "Terms & Conditions (服务条款)",
            content: `
                <div class="space-y-4 text-left">
                    <div>
                        <h4 class="font-bold text-base mb-1">1. 预约与定金 (Appointments)</h4>
                        <p>所有服务建议提前 3-5 天预约。为了预留您的专属时段，我们可能会收取定金。定金将在服务完成后从总账单中扣除。</p>
                    </div>
                    <div>
                        <h4 class="font-bold text-base mb-1">2. 迟到与取消 (Late & Cancellation)</h4>
                        <p>请准时到达。若迟到超过 15 分钟，为了不影响下一位客人的服务，我们保留缩短服务时间或取消预约的权利，定金可能不予退还。</p>
                        <p>如需更改或取消，请至少提前 24 小时通知我们。</p>
                    </div>
                    <div>
                        <h4 class="font-bold text-base mb-1">3. 健康告知 (Health & Safety)</h4>
                        <p>若您有眼部感染、皮肤敏感、怀孕或近期做过眼部手术，请务必在服务前告知美睫师。若因隐瞒健康状况导致的不适，本店概不负责。</p>
                    </div>
                </div>
            `
        },
        privacy: {
            title: "Privacy Policy (隐私政策)",
            content: `
                <div class="space-y-4 text-left">
                    <p>我们非常重视您的隐私 (We value your privacy)。</p>
                    <ul class="list-disc pl-5 space-y-2">
                        <li><strong>信息收集：</strong>我们收集您的姓名、电话和邮箱仅用于预约确认、会员积分记录及售后服务。</li>
                        <li><strong>信息安全：</strong>您的个人资料将被严格保密，绝不会出售或透露给第三方营销机构。</li>
                        <li><strong>照片使用：</strong>在征得您同意的情况下，我们可能会拍摄服务前后的对比照用于店铺宣传。</li>
                    </ul>
                </div>
            `
        },
        return_policy: {
            title: "Return Policy (退换货政策)",
            content: `
                <div class="space-y-4 text-left">
                    <div>
                        <h4 class="font-bold text-base mb-1">💅 服务项目 (Services)</h4>
                        <p class="text-red-500 font-bold">服务一经完成并离开店铺，恕不退款 (Strictly no refunds)。</p>
                        <p>若您对服务效果有任何不满，请在服务结束当场提出，或在 3 天内联系我们，我们将免费为您进行调整或修补。</p>
                    </div>
                    <div class="border-t pt-4">
                        <h4 class="font-bold text-base mb-1">📦 实体商品 (Products)</h4>
                        <p>商品（如睫毛增长液、护理液等）若未拆封且保留原包装，可在购买后 7 天内凭收据进行更换。</p>
                        <p>已拆封或因人为原因损坏的商品，恕不接受退换。</p>
                    </div>
                </div>
            `
        }
    };

    const policy = policies[type];
    if (!policy) return;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    // 使用 config.primary_action_color 来保持风格统一
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.98); padding: 32px; border-radius: 16px; max-width: 600px; width: 100%; border-top: 4px solid ${config.primary_action_color}; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-height: 80vh; overflow-y: auto;">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <h3 style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.primary_action_color};">
                    ${policy.title}
                </h3>
                <button id="closePolicyBtn" style="font-size: 24px; color: ${config.text_color}; background: none; border: none; cursor: pointer; opacity: 0.5; transition: opacity 0.2s;">✕</button>
            </div>
            
            <div class="text-sm leading-relaxed opacity-80" style="color: ${config.text_color}; font-family: sans-serif;">
                ${policy.content}
            </div>
            
            <div class="mt-8 text-center pt-4 border-t border-gray-100">
                <button id="okPolicyBtn" class="px-10 py-3 rounded-full shadow-lg transform active:scale-95 transition-all" 
                    style="background: ${config.primary_action_color}; color: #ffffff; font-weight: bold; font-size: 14px;">
                    我已了解 (Understood)
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const close = () => modal.remove();
    
    // 绑定关闭事件
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
             if (file.size > 307200) { alert('图片太大'); return; }
             const reader = new FileReader();
             reader.onload = (evt) => {
                 imageInput.value = evt.target.result;
                 updatePreview(evt.target.result);
             };
             reader.readAsDataURL(file);
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

function showProductModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;">
            <h3 class="mb-6" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                上架新商品
            </h3>
            
            <form id="productForm">
                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">商品名称</label>
                    <input type="text" id="productName" required
                        class="w-full px-4 py-3 rounded-lg border-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                </div>
                
                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">价格 (RM)</label>
                    <input type="number" id="productPrice" required min="0" step="0.01"
                        class="w-full px-4 py-3 rounded-lg border-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                </div>

                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">商品图片</label>
                    <input type="file" id="prodFileInput" accept="image/*" style="display: none;">
                    
                    <div id="prodDropZone" style="border: 2px dashed ${config.primary_action_color}; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s; background: ${config.primary_action_color}11;">
                        <p id="prodUploadText" style="color: ${config.text_color}; opacity: 0.7; pointer-events: none;">
                            🛍️ 点击上传商品图<br><span style="font-size: 12px;">(支持拖拽或粘贴链接)</span>
                        </p>
                        <img id="prodImagePreview" src="" style="max-height: 150px; display: none; margin: 0 auto; border-radius: 8px;">
                    </div>

                    <input type="text" id="productImage" placeholder="图片链接..." 
                        class="w-full px-4 py-2 mt-2 rounded-lg border-2 text-sm" style="font-family: Lato, sans-serif; border-color: ${config.text_color}33; color: ${config.text_color};">
                </div>
                
                <div class="mb-6">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">商品描述</label>
                    <textarea id="productDescription" required rows="3"
                        class="w-full px-4 py-3 rounded-lg border-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;"></textarea>
                </div>
                
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                        style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">上架商品</button>
                    <button type="button" id="cancelProductBtn" class="flex-1 py-3 rounded-lg"
                        style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">取消</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 图片逻辑复用
    const dropZone = document.getElementById('prodDropZone');
    const fileInput = document.getElementById('prodFileInput');
    const imageInput = document.getElementById('productImage');
    const preview = document.getElementById('prodImagePreview');
    const text = document.getElementById('prodUploadText');

    const updatePreview = (src) => {
        if (src) { preview.src = src; preview.style.display = 'block'; text.style.display = 'none'; }
        else { preview.style.display = 'none'; text.style.display = 'block'; }
    };
    imageInput.addEventListener('input', () => updatePreview(imageInput.value));
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => { // 👈 加 async
        const file = e.target.files[0];
        if (file) {
             try {
                 // 👇 商品图，最大宽 800px
                 const compressedBase64 = await compressImage(file, 800, 0.7);
                 imageInput.value = compressedBase64; 
                 updatePreview(compressedBase64);
             } catch (err) { console.error(err); }
        }
    });

    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const success = await createRecord({
            type: 'product',
            name: document.getElementById('productName').value,
            price: parseFloat(document.getElementById('productPrice').value),
            description: document.getElementById('productDescription').value,
            imageUrl: imageInput.value
        });
        if (success) modal.remove();
    });
    
    document.getElementById('cancelProductBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function showEditProductModal(config, product) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto;">
            <h3 class="mb-6" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                编辑商品: ${product.name}
            </h3>
            
            <form id="editProductForm">
                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">商品名称</label>
                    <input type="text" id="editProductName" required value="${product.name}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                </div>
                
                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">价格 (RM)</label>
                    <input type="number" id="editProductPrice" required min="0" step="0.01" value="${product.price}"
                        class="w-full px-4 py-3 rounded-lg border-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                </div>

                <div class="mb-4">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">商品图片</label>
                    <input type="file" id="editProdFileInput" accept="image/*" style="display: none;">
                    <div id="editProdDropZone" style="border: 2px dashed ${config.primary_action_color}; border-radius: 12px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s; background: ${config.primary_action_color}11;">
                        <img id="editProdImagePreview" src="${product.imageUrl || ''}" style="max-height: 150px; margin: 0 auto; border-radius: 8px; display: ${product.imageUrl ? 'block' : 'none'};">
                        <p id="editProdUploadText" style="color: ${config.text_color}; opacity: 0.7; pointer-events: none; display: ${product.imageUrl ? 'none' : 'block'};">
                            📸 点击修改图片
                        </p>
                    </div>
                    <input type="text" id="editProductImage" value="${product.imageUrl || ''}"
                        class="w-full px-4 py-2 mt-2 rounded-lg border-2 text-sm" style="font-family: Lato, sans-serif; border-color: ${config.text_color}33; color: ${config.text_color};">
                </div>
                
                <div class="mb-6">
                    <label class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">商品描述</label>
                    <textarea id="editProductDescription" required rows="3"
                        class="w-full px-4 py-3 rounded-lg border-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">${product.description}</textarea>
                </div>
                
                <div class="flex gap-3">
                    <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                        style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">保存更改</button>
                    <button type="button" id="cancelEditProductBtn" class="flex-1 py-3 rounded-lg"
                        style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">取消</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const dropZone = document.getElementById('editProdDropZone');
    const fileInput = document.getElementById('editProdFileInput');
    const imageInput = document.getElementById('editProductImage');
    const preview = document.getElementById('editProdImagePreview');
    const text = document.getElementById('editProdUploadText');

    const updatePreview = (src) => {
        if (src) { preview.src = src; preview.style.display = 'block'; text.style.display = 'none'; }
        else { preview.style.display = 'none'; text.style.display = 'block'; }
    };
    imageInput.addEventListener('input', () => updatePreview(imageInput.value));
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
             if (file.size > 307200) { alert('图片太大'); return; }
             const reader = new FileReader();
             reader.onload = (evt) => { imageInput.value = evt.target.result; updatePreview(evt.target.result); };
             reader.readAsDataURL(file);
        }
    });

    document.getElementById('editProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateRecord(product, {
            name: document.getElementById('editProductName').value,
            price: parseFloat(document.getElementById('editProductPrice').value),
            description: document.getElementById('editProductDescription').value,
            imageUrl: imageInput.value
        });
        modal.remove();
    });
    
    document.getElementById('cancelEditProductBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ==================== 购物车逻辑 ====================

// 1. 添加商品到购物车
function addToCart(productId) {
    const products = getDataByType('product');
    const product = products.find(p => p.id === productId);
    
    if (!product) return;
    
    // 检查购物车里是不是已经有这个东西了
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1; // 有就加数量
    } else {
        cart.push({
            ...product,
            quantity: 1
        }); // 没有就新加
    }
    
    showToast(`🛒 已加入: ${product.name}`);
    renderApp(); // 刷新页面更新小红点
}

// 2. 显示购物车详情弹窗
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
                    提交订单 (WhatsApp)
                </button>
            `}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定事件
    document.getElementById('closeCartBtn').addEventListener('click', () => modal.remove());
    
    // 删除单个商品
    document.querySelectorAll('.removeFromCartBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            cart.splice(index, 1); // 移除该项
            modal.remove(); // 关闭旧弹窗
            showCartModal(config); // 重新打开刷新
            renderApp(); // 刷新主页更新小红点
        });
    });
    
    // 结算按钮 (目前先做一个简单的模拟结算)
    document.getElementById('checkoutBtn')?.addEventListener('click', async () => {
        if (!loggedInCustomerName) {
            showToast('请先登录后再提交订单');
            return;
        }
        
        // 创建订单记录
        const success = await createRecord({
            type: 'order', // 新的数据类型：订单
            customerName: loggedInCustomerName,
            items: cart,
            totalAmount: total,
            status: 'pending'
        });
        
        if (success) {
            showToast('🎉 订单已提交！我们要联系您安排发货。');
            cart = []; // 清空购物车
            modal.remove();
            renderApp();
        }
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
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
             try {
                 // 👇 动态图，最大宽 800px
                 const compressedBase64 = await compressImage(file, 800, 0.7);
                 imageInput.value = compressedBase64; 
                 updatePreview(compressedBase64);
             } catch (err) { console.error(err); }
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
// 👇 新增：数据备份与恢复功能 (放在文件最末尾)
// ==========================================
function exportData() {
    const allData = {
        customers: getDataByType('customer_account'),
        bookings: getDataByType('booking'),
        services: getDataByType('service'),
        products: getDataByType('product'),
        orders: getDataByType('product_order'),
        reviews: getDataByType('review'),
        settings: getDataByType('discount_settings'),
        owner: getDataByType('owner_credentials')
    };
    
    const dataStr = JSON.stringify(allData, null, 2); // 美化格式
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `GemBrow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('备份文件已下载 ✅');
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;

    if (!confirm("⚠️ 警告：导入数据将【覆盖】当前所有数据！\n建议先导出备份。\n确定要继续吗？")) {
        input.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // 简单的校验
            if (importedData.customers && importedData.bookings) {
                localStorage.setItem('gem_brow_data', JSON.stringify(importedData.customers.concat(
                    importedData.bookings, 
                    importedData.services || [], 
                    importedData.products || [], 
                    importedData.orders || [],
                    importedData.reviews || [],
                    importedData.settings || [],
                    importedData.owner || []
                )));
                
                alert("数据恢复成功！系统将刷新。");
                location.reload();
            } else {
                alert("文件格式错误，找不到关键数据！");
            }
        } catch (err) {
            console.error(err);
            alert("读取失败，文件可能已损坏。");
        }
    };
    reader.readAsText(file);
}

// ==========================================
// 👇 新增：全局挂件 (Google翻译 + WhatsApp悬浮窗)
// ==========================================
function initGlobalWidgets() {
    // 1. 注入 CSS (加了 ID 检查，防止重复注入)
    if (!document.getElementById('global-widget-styles')) {
        const style = document.createElement('style');
        style.id = 'global-widget-styles'; // 给它个身份证
        style.innerHTML = `
            /* 彻底隐藏 Google 顶部横条 */
            .goog-te-banner-frame.skiptranslate { display: none !important; height: 0 !important; visibility: hidden !important; } 
            iframe.goog-te-banner-frame { display: none !important; height: 0 !important; visibility: hidden !important; }
            body { top: 0px !important; position: static !important; min-height: 100vh !important; }
            
            #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
            .VIpgJd-ZVi9od-ORHb-OEVmcd { display: none !important; }

            #google_translate_element img { display: none !important; }
            .goog-te-gadget-simple { background-color: transparent !important; border: none !important; padding: 0 !important; font-size: 13px !important; }
            .goog-te-menu-value span { color: #555 !important; font-weight: bold; border: none !important; }
            .goog-te-menu-value span:nth-child(2), .goog-te-menu-value span:nth-child(3) { display: none !important; }
        `;
        document.head.appendChild(style);
    }

    // 2. WhatsApp 按钮 (每次调用都会重新获取最新设置)
    const settings = getDiscountSettings(); 
    // ⚠️ 确保这里读取的是最新的 wa_number
    const myPhone = settings.wa_number || "60123456789"; 
    const defaultText = "你好，我想咨询美睫服务 (Hi, I am interested in eyelash services)";
    const waUrl = `https://wa.me/${myPhone}?text=${encodeURIComponent(defaultText)}`;
    
    // 🔥 关键：先删掉旧的，再加新的
    const oldBtn = document.querySelector('.floating-wa-btn');
    if (oldBtn) oldBtn.remove();

    const waBtn = document.createElement('a');
    waBtn.href = waUrl;
    waBtn.target = "_blank";
    waBtn.className = "floating-wa-btn";
    
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
        z-index: 9999;
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

    // 3. Google 翻译 (只加载一次)
    if (document.getElementById('google_translate_element')) return;

    const translateDiv = document.createElement('div');
    translateDiv.id = "google_translate_element";
    translateDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px; 
        z-index: 10000;
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
initApp();
initGlobalWidgets();