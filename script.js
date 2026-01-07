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

// ==================== 数据 SDK 处理器 (已修改：支持多Tab隔离) ====================
const dataHandler = {
    onDataChanged(data) {
        allData = data;

        // 1. 加载最新的业主密码
        const credData = data.find(item => item.type === 'owner_credentials');
        if (credData) {
            ownerCredentials = { username: credData.username, password: credData.password };
        }

        // 2. 【核心修改】检查自动登录 (改为 sessionStorage)
        // 只有在当前是 'login' 模式（刚打开网页）时才检查
        if (currentMode === 'login') {
            try {
                // 👇 改为 sessionStorage (Tab 独立)
                const sessionStr = sessionStorage.getItem('gembrow_session'); 
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    // 检查是否过期
                    if (Date.now() < session.expiry) {
                        console.log('🔄 发现有效会话 (Tab独立)，自动登录中...');
                        if (session.mode === 'owner') {
                            currentMode = 'owner';
                            currentView = 'manage'; 
                        } else if (session.mode === 'customer') {
                            // 确保这个用户还存在
                            const userExists = data.find(u => u.username === session.username && u.type === 'customer_account');
                            if (userExists) {
                                currentMode = 'customer';
                                currentView = 'services';
                                loggedInCustomerName = session.username;
                            }
                        }
                    } else {
                        sessionStorage.removeItem('gembrow_session'); // 👇 改为 sessionStorage
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

// 认证函数 (已修改：支持多Tab隔离)
function handleLogin(username, password) {
    // 1. 检查业主账户
    if (username === ownerCredentials.username && password === ownerCredentials.password) {
        currentMode = 'owner';
        currentView = 'manage';
        loggedInCustomerName = '';

        // 【核心修改】保存到 sessionStorage
        const session = {
            mode: 'owner',
            username: '',
            expiry: Date.now() + 14400000 // 4小时
        };
        sessionStorage.setItem('gembrow_session', JSON.stringify(session)); // 👇 Changed

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

        // 【核心修改】保存到 sessionStorage
        const session = {
            mode: 'customer',
            username: username,
            expiry: Date.now() + 14400000
        };
        sessionStorage.setItem('gembrow_session', JSON.stringify(session)); // 👇 Changed

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

// ==========================================
// 👇 [v1.3.6 (Beta Fix] 登出函数 (清理 Tab 会话)
// ==========================================
window.handleLogout = function() {
    // 1. 清除会话 (Tab 独立)
    sessionStorage.removeItem('gembrow_session'); // 👇 改为 sessionStorage
    
    // 2. 重置状态
    loggedInCustomerName = null;
    currentMode = 'login'; 
    showMenu = false;      
    
    // 3. 刷新
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
// 👇 [v1.3.6 (Beta) Fix] 登录/注册页面 (修复无法登录问题)
// ==========================================
function renderLoginPage() {
    const app = document.getElementById('app');
    const config = window.elementSdk?.config || defaultConfig; // 防止 config 为空
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
        // 📝 注册逻辑 (修复：强制校验手机/邮箱唯一性)
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!document.getElementById('agreeTerms').checked) {
                alert("请先勾选同意条款！"); return;
            }
            
            const u = document.getElementById('regUsername').value.trim();
            const p = document.getElementById('regPassword').value;
            const eMail = document.getElementById('regEmail').value.trim();
            const ph = cleanPhoneNumber(document.getElementById('regPhone').value); 

            const allCustomers = getDataByType('customer_account');

            // 🛑 1. 检查用户名 (虽然可以改，但注册时暂时不许重复，避免初始冲突)
            if (allCustomers.find(acc => acc.username.toLowerCase() === u.toLowerCase())) {
                showToast('❌ 该用户名已被占用，请换一个');
                return;
            }

            // 🛑 2. 检查手机号 (绝对唯一)
            if (allCustomers.find(acc => acc.phone === ph)) {
                showToast('❌ 该手机号已注册！请直接登录');
                return;
            }

            // 🛑 3. 检查邮箱 (绝对唯一)
            if (allCustomers.find(acc => acc.email.toLowerCase() === eMail.toLowerCase())) {
                showToast('❌ 该邮箱已注册！');
                return;
            }

            // ✅ 通过检查，创建账户
            const success = await createRecord({
                type: 'customer_account',
                username: u,
                password: p,
                email: eMail,
                phone: ph,
                address: '', // 初始化空地址
                points: 0,
                lifetime_points: 0,
                membershipLevel: 'bronze'
            });

            if(success) {
                showToast('✅ 注册成功！请登录');
                showRegisterForm = false; // 切换回登录页
                renderApp();
            }
        });
        
        // 绑定条款链接点击事件
        document.getElementById('regLinkTerms').addEventListener('click', (e) => { e.preventDefault(); showPolicyModal(config, 'terms'); });
        document.getElementById('regLinkPrivacy').addEventListener('click', (e) => { e.preventDefault(); showPolicyModal(config, 'privacy'); });
        document.getElementById('regLinkReturn').addEventListener('click', (e) => { e.preventDefault(); showPolicyModal(config, 'return_policy'); });

        document.getElementById('showLoginBtn').addEventListener('click', () => { showRegisterForm = false; renderApp(); });
    } else {
        // 登录逻辑
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('loginUsername').value;
            const pass = document.getElementById('loginPassword').value;

            // 1. 检查业主
            const owners = getDataByType('owner_credentials');
            const isOwner = owners.length > 0 
                ? owners.some(o => o.username === user && o.password === pass)
                : (user === 'admin' && pass === '1231');

            if (isOwner) {
                const session = { mode: 'owner', username: '', expiry: Date.now() + 14400000 };
                // 🔥 关键修改：存入 sessionStorage
                sessionStorage.setItem('gembrow_session', JSON.stringify(session));
                showToast('👑 欢迎回来，老板！');
                setTimeout(() => location.reload(), 500); 
                return;
            }

            // 2. 检查顾客
            const customers = getDataByType('customer_account');
            const validCustomer = customers.find(c => c.username === user && c.password === pass);

            if (validCustomer) {
                const session = { mode: 'customer', username: user, expiry: Date.now() + 14400000 };
                // 🔥 关键修改：存入 sessionStorage
                sessionStorage.setItem('gembrow_session', JSON.stringify(session));
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
// 👇 [v1.3.1-4] 主程序 (带用户头像的菜单)
// ==========================================
function renderMainApp(app, config, services, bookings, posts, customers) {
    cleanupDuplicateNotifications(); // 🔥 紧急清理重复通知
    const currentYear = new Date().getFullYear();
    const settings = getDiscountSettings();
    
    window.toggleMenu = () => {
        showMenu = !showMenu;
        renderApp();
    };

    // 🟢 [新增] 智能头像逻辑
    let userAvatarUrl = '';
    let userDisplayName = '';
    let userRoleName = '';

    if (currentMode === 'owner') {
        // 店长：显示店铺 Logo 或 默认头像
        userAvatarUrl = settings.logo_header || settings.logo_url || "https://ui-avatars.com/api/?name=Boss&background=000&color=fff&size=128";
        userDisplayName = "👑 店长 (Owner)";
        userRoleName = "Administrator";
    } else if (loggedInCustomerName) {
        // 顾客：尝试查找头像，如果没有就用名字生成
        const currentCustomer = customers.find(c => c.username === loggedInCustomerName);
        // 如果顾客数据里有 avatar 字段就用，没有就用 ui-avatars 生成
        userAvatarUrl = (currentCustomer && currentCustomer.avatar) 
            ? currentCustomer.avatar 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInCustomerName)}&background=random&color=fff&size=128`;
        userDisplayName = loggedInCustomerName;
        userRoleName = "Verified Member";
    } else {
        // 游客
        userAvatarUrl = "https://ui-avatars.com/api/?name=Guest&background=eee&color=999&size=128";
        userDisplayName = "游客 (Guest)";
        userRoleName = "Visitor";
    }

    app.innerHTML = `
        <div class="min-h-full">
            <header class="print:hidden bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-40 transition-all duration-300" 
                style="border-bottom: 3px solid ${config.primary_action_color};">
                <div class="max-w-7xl mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <img src="${settings.logo_header || settings.logo_url || './assets/header_logo.png'}" 
                             alt="${config.app_title}" 
                             class="rounded-full shadow-sm hover:rotate-12 transition-transform duration-500" 
                             style="height: 42px; width: 42px; object-fit: cover;">
                        <h1 class="text-lg font-bold hidden md:block" style="color: ${config.text_color}; font-family: ${config.font_family};">
                            ${settings.shop_name || config.app_title}
                        </h1>
                    </div>

                    <div class="flex items-center gap-3">
                        
                        ${(() => {
                        const currentUser = currentMode === 'owner' ? 'admin' : loggedInCustomerName;
                        
                        // 获取普通未读
                        const personalUnread = getDataByType('notification')
                            .filter(n => !n.isRead && n.targetUser === currentUser).length;
                        
                        // 获取系统消息未读
                        const readSystemIds = JSON.parse(localStorage.getItem(`read_sys_notis_${currentUser}`) || '[]');
                        const systemUnread = getDataByType('notification')
                            .filter(n => n.targetUser === 'all' && !readSystemIds.includes(n.id)).length;
                            
                        const totalUnread = personalUnread + systemUnread;
                        
                        return `
                            <button onclick="showNotificationModal(elementSdk.config)" 
                                class="relative p-2 rounded-xl transition-all hover:bg-gray-100 group">
                                <span class="text-2xl group-hover:scale-110 transition-transform block">📬</span>
                                ${totalUnread > 0 ? `
                                    <span class="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm animate-bounce">
                                        ${totalUnread}
                                    </span>
                                ` : ''}
                            </button>
                        `;
                    })()}

                    <button onclick="toggleMenu()" 
                        class="px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all" 
                        style="border: 2px solid ${config.primary_action_color}; color: ${config.primary_action_color};">
                        ${loggedInCustomerName ? `<img src="${userAvatarUrl}" class="w-5 h-5 rounded-full border border-current">` : ''}
                        <span>${showMenu ? '✕ 关闭' : '☰ 菜单'}</span>
                    </button>
                </div>
            </header>
            
            ${showMenu ? `
                <div id="menuOverlay" onclick="toggleMenu()" class="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm print:hidden flex items-start justify-end">
                    
                    <div onclick="event.stopPropagation()" 
                         class="animate-fade-in-down bg-white w-full md:w-80 shadow-2xl overflow-hidden"
                         style="
                            border-bottom-left-radius: 24px; 
                            border-bottom-right-radius: 0px; 
                            border-bottom-left-radius: 24px;
                            border-top: none; 
                            border-left: 1px solid #eee;
                            border-bottom: 4px solid ${config.primary_action_color};
                         ">
                        
                        <div class="p-6 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
                            <img src="${userAvatarUrl}" alt="Avatar" 
                                 class="w-14 h-14 rounded-full border-4 border-white shadow-md object-cover bg-white">
                            
                            <div class="flex-1 min-w-0">
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">${userRoleName}</p>
                                <h3 class="font-bold text-lg text-gray-800 truncate leading-tight">
                                    ${userDisplayName}
                                </h3>
                                ${loggedInCustomerName ? `<p class="text-xs text-green-500 font-bold mt-1">● Online</p>` : ''}
                            </div>
                        </div>

                        <div class="py-2">
                            <button onclick="currentView='home'; toggleMenu(); renderApp()" class="w-full text-left px-5 py-3 hover:bg-gray-50 font-bold text-gray-700 flex items-center gap-3 text-sm transition-colors">
                                🏠 首页 (Home)
                            </button>
                            
                            ${currentMode === 'owner' ? `
                                <button onclick="currentView='stats'; toggleMenu(); renderApp()" class="w-full text-left px-5 py-3 hover:bg-gray-50 font-bold text-gray-700 flex items-center gap-3 text-sm transition-colors">
                                    📊 报表 (Stats)
                                </button>
                                <button onclick="currentView='customers'; toggleMenu(); renderApp()" class="w-full text-left px-5 py-3 hover:bg-gray-50 font-bold text-gray-700 flex items-center gap-3 text-sm transition-colors">
                                    👥 客户 (CRM)
                                </button>
                                <button onclick="currentView='settings'; toggleMenu(); renderApp()" class="w-full text-left px-5 py-3 hover:bg-gray-50 font-bold text-gray-700 flex items-center gap-3 text-sm transition-colors">
                                    ⚙️ 设置 (Settings)
                                </button>
                            ` : `
                                <button onclick="currentView='mybookings'; toggleMenu(); renderApp()" class="w-full text-left px-5 py-3 hover:bg-gray-50 font-bold text-gray-700 flex items-center gap-3 text-sm transition-colors">
                                    ⏳ 待办事项 (Pending)
                                </button>
                                <button onclick="currentView='history'; toggleMenu(); renderApp()" class="w-full text-left px-5 py-3 hover:bg-gray-50 font-bold text-gray-700 flex items-center gap-3 text-sm transition-colors">
                                    📜 历史与账单 (History)
                                </button>
                                <button onclick="currentView='profile'; toggleMenu(); renderApp()" class="w-full text-left px-5 py-3 hover:bg-gray-50 font-bold text-gray-700 flex items-center gap-3 text-sm transition-colors">
                                    👤 账户设置 (Profile)
                                </button>
                            `}
                            
                            <div class="h-px bg-gray-100 my-1"></div>

                            <button onclick="showFeedbackModal(elementSdk.config)" class="w-full text-left px-5 py-3 hover:bg-yellow-50 font-bold text-gray-600 flex items-center gap-3 text-sm transition-colors">
                                🐞 反馈问题
                            </button>
                            
                            <button class="w-full text-left px-5 py-3 hover:bg-red-50 font-bold text-red-500 flex items-center gap-3 text-sm transition-colors" 
                                onclick="window.handleLogout()">
                                ${loggedInCustomerName || currentMode === 'owner' ? '🚪 退出登录' : '🏠 返回首页'}
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <main class="max-w-7xl mx-auto px-4 md:px-6 py-8 print:p-0">
                ${currentMode === 'owner' ? renderOwnerView(config, services, bookings, posts, customers) : renderCustomerView(config, services, bookings, posts)}
            </main>

            <footer class="mt-auto py-12 text-center border-t border-gray-100 print:hidden bg-[#fafafa]">
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
                       Copyright © ${currentYear} ${settings.shop_name || config.app_title}. <br class="md:hidden"> Powered by Threshold Studio.
                   </p>
               </div>
           </footer>
        </div>
    `;

    attachEventListeners(config, services, bookings, posts, customers);
}

// ==========================================
// 👇 [v1.3.6 Beta] 老板后台 (修复：取消撤回时限 & 样式保持)
// ==========================================
function renderOwnerView(config, services, bookings, posts, customers) {
    window.cashierMode = window.cashierMode || 'booking'; 
    window.ownerContentTab = window.ownerContentTab || 'service'; 
    
    window.filterStatus = window.filterStatus || 'pending';
    window.searchQuery = window.searchQuery || '';
    window.orderFilterStatus = window.orderFilterStatus || 'pending';

    const orders = getDataByType('order');
    const products = getDataByType('product');

    if (currentView === 'stats') return renderStats(config, services, bookings, customers, orders);
    else if (currentView === 'customers') return renderCustomersManagement(config, customers, bookings);
    else if (currentView === 'settings') return renderSettings(config);

    // 1. 预约筛选
    let filteredBookings = bookings.filter(b => {
        if (window.filterStatus === 'all') return true;
        if (window.filterStatus === 'pending') return b.status === 'pending' || b.status === 'serving';
        return b.status === window.filterStatus;
    }).filter(b => {
        if (!window.searchQuery) return true;
        const q = window.searchQuery.toLowerCase();
        return (b.customerName || '').toLowerCase().includes(q) ||
               (b.customerPhone || '').includes(q) ||
               (b.serviceName || '').toLowerCase().includes(q) ||
               (b.receiptNumber || '').toLowerCase().includes(q);
    });

    filteredBookings.sort((a, b) => {
        if (a.status === 'serving' && b.status !== 'serving') return -1;
        if (a.status !== 'serving' && b.status === 'serving') return 1;
        if (window.filterStatus === 'pending') {
            return new Date(`${a.appointmentDate}T${a.appointmentTime}`) - new Date(`${b.appointmentDate}T${b.appointmentTime}`);
        }
        return new Date(b.completedAt || b.cancelledAt || b.createdAt) - new Date(a.completedAt || a.cancelledAt || a.createdAt);
    });

    // 2. 订单筛选
    const filteredOrders = orders.filter(o => {
        if (window.orderFilterStatus === 'all') return true;
        if (window.orderFilterStatus === 'pending') return o.status === 'pending' || o.status === 'pending_payment' || o.status === 'paid_verify';
        return o.status === window.orderFilterStatus;
    });
    filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const pendingOrderCount = orders.filter(o => o.status === 'pending' || o.status === 'pending_payment' || o.status === 'paid_verify').length;

    // 🅰️ 零售模式
    if (window.cashierMode === 'retail') {
        return `
            <div>
                <div class="mb-6 bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex gap-2 sticky top-0 z-30">
                    <button onclick="window.cashierMode='booking'; renderApp()" class="flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 bg-gray-50 text-gray-500 hover:bg-gray-100"><span>📅</span> 预约管理</button>
                    <button onclick="window.cashierMode='retail'; renderApp()" class="flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 bg-pink-600 text-white shadow-md"><span>🛒</span> 零售开单</button>
                </div>
                ${renderRetailPad(config, services)}
            </div>
        `;
    }

    // 🅱️ 预约管理模式
    return `
        <div class="animate-fade-in-up pb-20">
            <div class="mb-6 bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex gap-2 sticky top-0 z-30">
                <button onclick="window.cashierMode='booking'; renderApp()" class="flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 bg-gray-800 text-white shadow-md"><span>📅</span> 预约管理</button>
                <button onclick="window.cashierMode='retail'; renderApp()" class="flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 bg-gray-50 text-gray-500 hover:bg-gray-100"><span>🛒</span> 零售开单</button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 items-start">
                
                <div class="space-y-4">
                    <div class="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <h2 class="font-bold text-gray-800 text-lg">📅 预约管理</h2>
                        <div class="flex gap-2">
                            <button id="blockTimeBtn" class="px-3 py-1.5 rounded-lg bg-gray-800 text-white text-xs font-bold shadow-md">⛔ 锁定</button>
                            <select onchange="window.filterStatus = this.value; renderApp()" class="px-2 py-1.5 rounded-lg border bg-gray-50 text-xs font-bold outline-none">
                                <option value="pending" ${window.filterStatus === 'pending' ? 'selected' : ''}>⏳ 待服务</option>
                                <option value="all" ${window.filterStatus === 'all' ? 'selected' : ''}>📂 全部</option>
                                <option value="completed" ${window.filterStatus === 'completed' ? 'selected' : ''}>✅ 已完成</option>
                                <option value="cancelled" ${window.filterStatus === 'cancelled' ? 'selected' : ''}>🚫 已取消</option>
                            </select>
                        </div>
                    </div>

                    <div class="relative">
                         <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                         <input type="text" id="searchInput" placeholder="搜客户/电话/单号..." value="${window.searchQuery}" 
                            oninput="window.searchQuery=this.value; renderApp()"
                            class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-pink-500 focus:outline-none text-sm font-bold shadow-sm">
                    </div>

                    ${filteredBookings.length === 0 ? `
                        <div class="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-200"><p class="text-gray-400 text-sm">📭 暂无记录</p></div>
                    ` : `
                        <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                            ${filteredBookings.map(booking => {
                                const now = new Date();
                                let canRevert = false;
                                let isLocked = false;
                                
                                // 🔥 核心修复：计算是否可撤销 (无论是完成还是取消)
                                const actionTime = booking.completedAt || booking.cancelledAt;
                                if (actionTime) {
                                    const diffMins = (now - new Date(actionTime)) / 1000 / 60;
                                    if (diffMins <= 30) canRevert = true; // 30分钟内可撤销
                                    if (diffMins / 60 >= 24) isLocked = true;
                                }

                                const isServing = booking.status === 'serving';
                                const delay = booking.delayMinutes || 0;
                                const service = services.find(s => s.name === booking.serviceName);
                                const imgUrl = service ? (service.imageUrl || service.imgUrl) : 'https://cdn-icons-png.flaticon.com/512/2813/2813248.png';

                                return `
                                    <div onclick="if(typeof showOwnerAppointmentModal === 'function') showOwnerAppointmentModal(elementSdk.config, getDataByType('booking').find(x => x.id === '${booking.id}'))" 
                                         class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative hover:shadow-md transition-shadow group cursor-pointer
                                         ${isServing ? 'ring-2 ring-green-500 ring-offset-1' : ''}">
                                        
                                        <div class="absolute left-0 top-4 bottom-4 w-1 rounded-r-lg ${isServing ? 'bg-green-500' : booking.status === 'pending' ? 'bg-yellow-400' : booking.status === 'completed' ? 'bg-green-500' : 'bg-red-400'}"></div>
                                        
                                        <div class="pl-4 flex gap-3">
                                            <div class="w-14 h-14 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                                                <img src="${imgUrl}" class="w-full h-full object-cover">
                                            </div>

                                            <div class="flex-1 min-w-0">
                                                <div class="flex justify-between items-start mb-1">
                                                    <h3 class="font-bold text-gray-800 text-base truncate">${booking.customerName}</h3>
                                                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">${booking.receiptNumber?.slice(-4) || '---'}</span>
                                                </div>
                                                <p class="text-xs text-gray-500 mb-1">📞 ${booking.customerPhone}</p>
                                                
                                                <div class="flex items-center justify-between mt-2">
                                                    <span class="text-sm font-bold text-pink-600 truncate">💅 ${booking.serviceName}</span>
                                                    <div class="text-right">
                                                        <div class="text-sm font-bold text-gray-800">
                                                            ${booking.appointmentTime}
                                                            ${delay > 0 ? `<span class="ml-1 text-[9px] bg-red-100 text-red-600 px-1 rounded">+${delay}m</span>` : ''}
                                                        </div>
                                                        ${isServing ? `<span class="text-[9px] text-green-600 font-bold animate-pulse">● 服务中</span>` : ''}
                                                    </div>
                                                </div>

                                                ${booking.status === 'pending' ? `
                                                    <div class="mt-2 pt-2 border-t border-gray-100 flex justify-end gap-2">
                                                        <button onclick="event.stopPropagation(); window.showCancelReasonModal('${booking.id}')" class="text-red-500 text-xs px-2 py-1 rounded border border-red-100 hover:bg-red-50">取消</button>
                                                        <button onclick="event.stopPropagation(); showCashierModal(elementSdk.config, getDataByType('booking').find(b => b.id === '${booking.id}'))" class="bg-blue-600 text-white text-xs px-3 py-1 rounded font-bold shadow hover:bg-blue-700">💰 收银</button>
                                                    </div>
                                                ` : ''}

                                                ${booking.status === 'completed' ? `
                                                    <div class="mt-2 pt-2 border-t border-gray-100 flex justify-end gap-2 text-[10px]">
                                                        <button onclick="event.stopPropagation(); showReceiptModal(elementSdk.config, getDataByType('booking').find(x => x.id === '${booking.id}'))" class="bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">🎫 小票</button>
                                                        ${!isLocked && canRevert ? `<button onclick="event.stopPropagation(); window.handleRevertBooking(elementSdk.config, getDataByType('booking').find(x => x.id === '${booking.id}'))" class="text-red-400 underline px-2 py-1">撤销</button>` : ''}
                                                    </div>
                                                ` : ''}

                                                ${booking.status === 'cancelled' ? `
                                                    <div class="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                                                        <p class="text-[10px] text-red-400">🚫 ${booking.cancelReason || '无原因'}</p>
                                                        
                                                        ${!isLocked && canRevert ? `
                                                            <button onclick="event.stopPropagation(); window.handleRevertBooking(elementSdk.config, getDataByType('booking').find(x => x.id === '${booking.id}'))" 
                                                              class="text-gray-400 text-xs underline hover:text-blue-500">
                                                              撤销取消
                                                            </button>
                                                        ` : ''}
                                                   </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>

                <div class="space-y-4">
                    <div class="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        <h2 class="font-bold text-gray-800 text-lg flex items-center gap-2">
                            📦 订单 
                            ${pendingOrderCount > 0 ? `<span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">${pendingOrderCount}</span>` : ''}
                        </h2>
                        <select onchange="window.orderFilterStatus = this.value; renderApp()" class="px-2 py-1.5 rounded-lg border bg-gray-50 text-xs font-bold outline-none">
                            <option value="pending" ${window.orderFilterStatus === 'pending' ? 'selected' : ''}>⏳ 待确认</option>
                            <option value="all" ${window.orderFilterStatus === 'all' ? 'selected' : ''}>📂 全部</option>
                            <option value="completed" ${window.orderFilterStatus === 'completed' ? 'selected' : ''}>✅ 已完成</option>
                            <option value="cancelled" ${window.orderFilterStatus === 'cancelled' ? 'selected' : ''}>🚫 已取消</option>
                        </select>
                    </div>

                    ${filteredOrders.length === 0 ? `
                        <div class="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-200"><p class="text-gray-400 text-sm">📭 暂无订单</p></div>
                    ` : `
                        <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                            ${filteredOrders.slice().reverse().map(order => `
                                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                    <div class="flex justify-between items-start mb-2 border-b border-gray-50 pb-2">
                                        <div>
                                            <h3 class="font-bold text-sm text-gray-800">${order.customerName}</h3>
                                            <p class="text-[10px] text-gray-400 font-mono">#${order.receiptNumber || order.id.slice(-6)}</p>
                                        </div>
                                        <span class="text-[10px] font-bold px-2 py-1 rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-50 text-red-400' : 'bg-blue-50 text-blue-600'}">
                                            ${order.status === 'completed' ? '已完成' : order.status === 'cancelled' ? '已取消' : '待处理'}
                                        </span>
                                    </div>
                                    <div class="space-y-1 mb-3">
                                        ${order.items.map(item => `<div class="flex justify-between text-sm"><span class="text-gray-600 truncate w-32">${item.name} <span class="text-gray-400 text-xs">x${item.quantity}</span></span><span class="font-mono text-gray-800">RM${(item.price * item.quantity).toFixed(2)}</span></div>`).join('')}
                                        <div class="flex justify-between font-bold text-sm pt-1 mt-1 border-t border-dashed border-gray-200"><span>Total</span><span class="text-pink-600">RM${parseFloat(order.totalAmount).toFixed(2)}</span></div>
                                    </div>
                                    ${order.status !== 'completed' && order.status !== 'cancelled' ? `
                                        <div class="flex gap-2 mt-2">
                                            <button onclick="window.showFulfillOrderModal(elementSdk.config, getDataByType('order').find(o => o.id === '${order.id}'))" class="flex-1 py-1.5 rounded bg-blue-600 text-white text-xs font-bold shadow hover:bg-blue-700">处理/发货</button>
                                            <button class="cancelOrderBtn flex-1 py-1.5 rounded border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50" data-id="${order.id}">取消</button>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>

            <hr class="my-8 border-gray-200">
            ${renderAssetTabs(services, products, posts, config)}
        </div>
    `;
}

// ==========================================
// 👇 [v1.3.6 (Beta) Fix] 全能财务驾驶舱 (防重算版)
// ==========================================
window.statsDateRange = window.statsDateRange || 'today'; 

function renderStats(config, services, bookings, customers, orders) {
    let allTransactions = [];

    // 1. 建立“已入账单号”名单 (白名单)
    // 只统计 status='completed' 的订单，'cancelled' 的会被自动过滤
    const processedReceipts = new Set(
        orders.filter(o => o.status === 'completed' && o.receiptNumber)
              .map(o => o.receiptNumber)
    );

    // A. 处理预约单
    bookings.forEach(b => {
        if (b.status === 'completed') {
            // 🛑 防重防火墙：如果这单已经有对应的 Order 在下面统计了，这里就跳过
            if (b.receiptNumber && processedReceipts.has(b.receiptNumber)) {
                return; 
            }

            allTransactions.push({
                type: 'Service', 
                rawDate: new Date(b.completedAt || `${b.appointmentDate}T${b.appointmentTime}`),
                receiptNo: b.receiptNumber || '-',
                customer: b.customerName,
                payment: b.paymentMethod || 'Cash',
                summary: `💅 ${b.serviceName}`, 
                amount: parseFloat(b.totalAmount || b.servicePrice || 0),
                originalObj: b
            });
        }
    });

    // B. 处理流水单 (Orders)
    orders.forEach(o => {
        // 🔥 关键：只统计已完成的，撤回的(cancelled)会被忽略
        if (o.status === 'completed') {
            const summary = o.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
            allTransactions.push({
                type: o.isRetail ? 'Retail' : 'Order', 
                rawDate: new Date(o.completedAt || o.createdAt),
                receiptNo: o.receiptNumber || '-',
                customer: o.customerName,
                payment: o.paymentMethod || 'Cash',
                summary: `📦 ${summary}`,
                amount: parseFloat(o.totalAmount || 0),
                originalObj: o
            });
        }
    });

    // --- 以下渲染逻辑保持不变 ---
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let filteredData = allTransactions.filter(t => {
        const tDate = t.rawDate;
        const tDateStr = tDate.toLocaleDateString();
        if (window.statsDateRange === 'today') return tDateStr === todayStr;
        else if (window.statsDateRange === 'yesterday') return tDateStr === yesterdayStr;
        else if (window.statsDateRange === 'month') return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        else return true;
    });

    filteredData.sort((a, b) => b.rawDate - a.rawDate);

    const totalRevenue = filteredData.reduce((sum, t) => sum + t.amount, 0);
    const totalCount = filteredData.length;
    
    return `
        <div class="space-y-6">
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">📊 财务报表</h2>
                    <p class="text-xs text-gray-400 mt-1">
                        ${window.statsDateRange === 'today' ? `📅 今天 (${todayStr})` : 
                          window.statsDateRange === 'yesterday' ? `⏮ 昨天 (${yesterdayStr})` :
                          window.statsDateRange === 'month' ? `🗓 本月 (${currentYear}-${currentMonth+1})` : '📈 历史全部数据'}
                    </p>
                </div>
                <div class="flex bg-gray-100 p-1 rounded-xl">
                    <button onclick="window.statsDateRange='today'; renderApp()" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${window.statsDateRange === 'today' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">今天</button>
                    <button onclick="window.statsDateRange='yesterday'; renderApp()" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${window.statsDateRange === 'yesterday' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">昨天</button>
                    <button onclick="window.statsDateRange='month'; renderApp()" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${window.statsDateRange === 'month' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">本月</button>
                    <button onclick="window.statsDateRange='all'; renderApp()" class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${window.statsDateRange === 'all' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">全部</button>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 print:hidden">
                <div class="bg-gradient-to-br from-pink-500 to-red-500 rounded-2xl p-4 text-white shadow-lg shadow-pink-200">
                    <p class="text-xs opacity-80 font-bold uppercase">Total Revenue</p>
                    <h3 class="text-2xl font-bold mt-1">RM${totalRevenue.toFixed(2)}</h3>
                </div>
                <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <p class="text-xs text-gray-400 font-bold uppercase">Transactions</p>
                    <h3 class="text-2xl font-bold text-gray-800 mt-1">${totalCount}</h3>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 class="font-bold text-gray-700">📜 交易流水</h3>
                    <button onclick="printStats('${window.statsDateRange}')" class="text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-colors print:hidden">
                        🖨️ 打印
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-xs text-gray-400 uppercase border-b bg-gray-50">
                                <th class="p-4 pl-6">Time</th>
                                <th class="p-4">No.</th>
                                <th class="p-4">Cust</th>
                                <th class="p-4">Detail</th>
                                <th class="p-4 text-right pr-6">Amt</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm">
                            ${filteredData.length === 0 ? `<tr><td colspan="5" class="p-8 text-center text-gray-400">无记录</td></tr>` : 
                            filteredData.map(t => `
                                <tr class="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                    <td class="p-4 pl-6 font-mono text-xs text-gray-500">${t.rawDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                    <td class="p-4 font-mono font-bold text-gray-600">${t.receiptNo}</td>
                                    <td class="p-4 font-bold text-gray-800">${t.customer}</td>
                                    <td class="p-4 text-gray-600 truncate max-w-[200px]">${t.summary}</td>
                                    <td class="p-4 text-right pr-6 font-bold">RM${t.amount.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 👇 [v1.3.6（Beta] 客户管理 (美观样式 + 功能融合版)
// ==========================================
function renderCustomersManagement(config, customers, bookings) {
    const settings = getDiscountSettings();

    // 搜索筛选逻辑
    window.filterCustomerTable = (query) => {
        const lowerQ = query.toLowerCase();
        const rows = document.querySelectorAll('#customerTableBody tr');
        let hasResult = false;
        rows.forEach(row => {
            if (row.id === 'noDataRow') return;
            const name = row.dataset.name.toLowerCase();
            const phone = row.dataset.phone;
            if (name.includes(lowerQ) || phone.includes(lowerQ)) {
                row.style.display = ''; hasResult = true;
            } else {
                row.style.display = 'none';
            }
        });
        const noDataRow = document.getElementById('noDataRow');
        if (noDataRow) noDataRow.style.display = hasResult ? 'none' : '';
    };

    return `
        <div class="p-4 animate-fade-in pb-20">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold" style="color: ${config.primary_action_color};">👥 客户管理 (${customers.length})</h2>
                <button id="addCustomerBtn" class="px-6 py-2 rounded-lg text-white font-bold shadow-md transform active:scale-95 transition-transform" 
                    style="background: ${config.primary_action_color};">
                    + 添加客户
                </button>
            </div>
            
            <div class="mb-4 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input type="text" placeholder="搜索客户名字 / 电话号码..." 
                        oninput="window.filterCustomerTable(this.value)" 
                        class="w-full pl-10 pr-4 py-2 rounded-lg border-2 border-gray-100 focus:border-pink-500 focus:outline-none font-bold text-gray-700">
                </div>
            </div>
            
            <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <table class="w-full text-left text-sm">
                    <thead class="bg-gray-50 border-b">
                        <tr>
                            <th class="p-4 text-gray-500">用户名</th>
                            <th class="p-4 text-gray-500">电话</th> 
                            ${settings.enable_membership ? '<th class="p-4 text-gray-500">等级</th>' : ''}
                            <th class="p-4 text-gray-500 text-center">积分 / 信誉</th>
                            <th class="p-4 text-gray-500 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody id="customerTableBody">
                        ${customers.length === 0 ? `
                            <tr><td colspan="5" class="p-8 text-center text-gray-400">暂无客户数据</td></tr>
                        ` : customers.map(acc => {
                            const lateCount = bookings.filter(b => b.customerName === acc.username && (b.markedLate15m || b.markedSevere30m)).length;

                            return `
                            <tr class="border-b last:border-0 hover:bg-gray-50 transition-colors" 
                                data-name="${acc.username || ''}" 
                                data-phone="${acc.phone || ''}">
                                
                                <td class="p-4 font-bold text-gray-700">
                                    <div class="flex items-center gap-2">
                                        <div class="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                                            <img src="${acc.avatar || acc.avatarUrl || 'https://cdn-icons-png.flaticon.com/512/847/847969.png'}" class="w-full h-full object-cover">
                                        </div>
                                        ${acc.username}
                                    </div>
                                </td>
                                <td class="p-4 text-gray-600 font-mono">${acc.phone || '-'}</td> 
                                
                                ${settings.enable_membership ? `<td class="p-4">${getMembershipBadge(acc.membershipLevel, config)}</td>` : ''}
                                
                                <td class="p-4 text-center">
                                    <div class="font-bold text-purple-600">${acc.points} 分</div>
                                    ${lateCount > 0 
                                        ? `<div class="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded mt-1 inline-block">迟到 ${lateCount} 次</div>` 
                                        : `<div class="text-[10px] text-green-500 mt-1 opacity-60">记录良好</div>`
                                    }
                                </td>
                                
                                <td class="p-4 text-right flex justify-end gap-2">
                                    <button onclick="showCustomerDetailModal(elementSdk.config, getDataByType('customer_account').find(c => c.id === '${acc.id}'))" 
                                        class="text-purple-600 font-bold border border-purple-200 px-3 py-1 rounded hover:bg-purple-50 transition-colors text-xs">
                                        👁️ 档案
                                    </button>
                                    <button onclick="showEditCustomerModal(elementSdk.config, '${acc.id}')" 
                                        class="text-blue-500 font-bold border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors text-xs">
                                        ✏️ 编辑
                                    </button>
                                    
                                    <button class="deleteCustomerBtn text-red-500 font-bold border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition-colors text-xs" 
                                        data-customer-id="${acc.id}">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        `}).join('')}
                        
                        <tr id="noDataRow" style="display: none;">
                            <td colspan="5" class="p-8 text-center text-gray-400">🔍 找不到匹配的客户</td>
                        </tr>
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
                    const currentVersion = 'v1.3.6 正式版';
                    // 检查是否已读
                    const lastSeen = localStorage.getItem('BeautyLoop_last_seen_version');
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
                <div class="mb-4">
                        <label class="block mb-1 text-sm font-bold text-gray-600">默认物流公司 (Default Courier)</label>
                        <select id="defaultCourier" class="w-full px-3 py-2 rounded border bg-gray-50 text-gray-700 font-bold">
                            <option value="">-- 请选择 --</option>
                            <option value="J&T" ${discountSettings.default_courier === 'J&T' ? 'selected' : ''}>J&T Express</option>
                            <option value="PosLaju" ${discountSettings.default_courier === 'PosLaju' ? 'selected' : ''}>Pos Laju</option>
                            <option value="GDEX" ${discountSettings.default_courier === 'GDEX' ? 'selected' : ''}>GDEX</option>
                            <option value="NinjaVan" ${discountSettings.default_courier === 'NinjaVan' ? 'selected' : ''}>Ninja Van</option>
                            <option value="ShopeeXpress" ${discountSettings.default_courier === 'ShopeeXpress' ? 'selected' : ''}>Shopee Xpress</option>
                            <option value="DHL" ${discountSettings.default_courier === 'DHL' ? 'selected' : ''}>DHL eCommerce</option>
                            <option value="CityLink" ${discountSettings.default_courier === 'CityLink' ? 'selected' : ''}>CityLink</option>
                            <option value="Lalamove" ${discountSettings.default_courier === 'Lalamove' ? 'selected' : ''}>Lalamove</option>
                            <option value="GrabExpress" ${discountSettings.default_courier === 'GrabExpress' ? 'selected' : ''}>GrabExpress</option>
                        </select>
                        <p class="text-[10px] text-gray-400 mt-1">设置后，发货时会自动填入此物流。</p>
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
    } else if (currentView === 'myorders' && loggedInCustomerName) { 
        return renderMyOrdersPage(config); // 👇 新增这个页面函数
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
// 👇 [v1.3.6 Beta] 顾客待办 (支持延迟/服务中显示)
// ==========================================
function renderMyBookings(config, bookings) {
    // 1. 数据准备 (包含 pending 和 serving)
    const myPendingBookings = bookings.filter(b => 
        b.customerName === loggedInCustomerName && 
        (b.status === 'pending' || b.status === 'serving')
    ).sort((a, b) => {
        // 正在服务的排最前
        if (a.status === 'serving' && b.status !== 'serving') return -1;
        if (a.status !== 'serving' && b.status === 'serving') return 1;
        return new Date(a.appointmentDate + 'T' + a.appointmentTime) - new Date(b.appointmentDate + 'T' + b.appointmentTime);
    });

    const allOrders = getDataByType('order');
    const myPendingOrders = allOrders.filter(o => 
        o.customerName === loggedInCustomerName && 
        (o.status === 'pending' || o.status === 'pending_payment' || o.status === 'paid_verify')
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 2. 初始化 Tab
    window.pendingTab = window.pendingTab || 'booking';

    return `
        <div class="max-w-md mx-auto animate-fade-in pb-20">
            <h2 class="text-2xl font-bold mb-4 text-center" style="color: ${config.primary_action_color};">
                ⏳ 我的待办事项
            </h2>

            <div class="flex border-b border-gray-200 mb-6">
                <button onclick="window.pendingTab='booking'; renderApp()" 
                    class="flex-1 pb-3 font-bold transition-colors ${window.pendingTab==='booking' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-400'}">
                    预约服务 ${myPendingBookings.length > 0 ? `(${myPendingBookings.length})` : ''}
                </button>
                <button onclick="window.pendingTab='order'; renderApp()" 
                    class="flex-1 pb-3 font-bold transition-colors ${window.pendingTab==='order' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-400'}">
                    商品订单 ${myPendingOrders.length > 0 ? `(${myPendingOrders.length})` : ''}
                </button>
            </div>

            <div class="min-h-[300px]">
                
                <div style="display: ${window.pendingTab === 'booking' ? 'block' : 'none'};">
                    ${myPendingBookings.length === 0 ? `
                        <div class="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 opacity-60">
                            <span class="text-4xl">📅</span>
                            <p class="text-sm text-gray-500 mt-2">没有等待中的预约</p>
                            <button onclick="document.getElementById('viewServices').click()" class="text-pink-500 text-xs font-bold mt-2 hover:underline">去预约 &rarr;</button>
                        </div>
                    ` : `
                        <div class="space-y-4">
                            ${myPendingBookings.map(booking => {
                                const isServing = booking.status === 'serving';
                                const delay = booking.delayMinutes || 0;
                                
                                return `
                                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group 
                                    ${isServing ? 'ring-2 ring-green-500 ring-offset-1' : ''}">
                                    
                                    <div class="absolute left-0 top-0 bottom-0 w-1 ${isServing ? 'bg-green-500' : 'bg-yellow-400'}"></div>
                                    
                                    <div class="flex justify-between items-start mb-2 pl-2">
                                        <h4 class="font-bold text-gray-800">${booking.serviceName}</h4>
                                        <span class="text-xs px-2 py-1 rounded-full font-bold ${isServing ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-yellow-100 text-yellow-700'}">
                                            ${isServing ? '💇‍♀️ 正在服务中' : '⏳ 等待到店'}
                                        </span>
                                    </div>
                                    
                                    <div class="pl-2">
                                        <p class="text-gray-600 text-sm mb-1">
                                            📅 ${booking.appointmentDate} 
                                        </p>
                                        <div class="flex items-center gap-2 mb-3">
                                            <span class="font-bold text-gray-800 text-lg">${booking.appointmentTime}</span>
                                            ${delay > 0 ? `
                                                <span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold border border-red-200 flex items-center gap-1">
                                                    ⏳ 延迟 +${delay}分
                                                </span>
                                            ` : ''}
                                        </div>

                                        ${delay > 0 ? `<p class="text-[10px] text-red-400 mb-2">* 店铺当前繁忙，您的预约时间已顺延，请留意。</p>` : ''}

                                        <div class="flex justify-between items-center border-t border-gray-100 pt-3">
                                            <span class="font-bold text-pink-600">RM${booking.totalAmount || booking.servicePrice}</span>
                                            
                                            ${!isServing ? `
                                                <button class="cancelBookingBtn px-3 py-1 rounded-lg text-xs border border-red-200 text-red-500 hover:bg-red-50 font-bold" data-id="${booking.id}">
                                                    取消预约
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                            }).join('')}
                        </div>
                    `}
                </div>

                <div style="display: ${window.pendingTab === 'order' ? 'block' : 'none'};">
                    ${myPendingOrders.length === 0 ? `
                        <div class="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 opacity-60">
                            <span class="text-4xl">📦</span>
                            <p class="text-sm text-gray-500 mt-2">没有处理中的订单</p>
                        </div>
                    ` : `
                        <div class="space-y-4">
                            ${myPendingOrders.map(order => `
                                <div class="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-400 relative overflow-hidden">
                                    <div class="flex justify-between items-start mb-3">
                                        <span class="text-xs text-gray-400">
                                            ${new Date(order.createdAt).toLocaleDateString()}
                                        </span>
                                        ${order.status === 'pending_payment' ? `<span class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 font-bold">待支付</span>` : 
                                          order.paymentStatus === 'paid_verify' ? `<span class="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-600 font-bold">审核中</span>` :
                                          `<span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600 font-bold">待发货</span>`
                                        }
                                    </div>

                                    <div class="bg-gray-50 p-3 rounded-lg mb-3">
                                        ${order.items.map(item => `
                                            <div class="flex justify-between text-sm mb-1">
                                                <span class="text-gray-700">${item.name} x${item.quantity}</span>
                                            </div>
                                        `).join('')}
                                        <div class="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-gray-800">
                                            <span>总计</span>
                                            <span class="text-blue-600">RM${order.totalAmount}</span>
                                        </div>
                                    </div>

                                    <div class="text-right flex justify-end gap-2">
                                         ${order.status === 'pending_payment' ? 
                                            `<button onclick="window.showUploadProofModal(getDataByType('order').find(o => o.id === '${order.id}'))" class="px-3 py-1 rounded-lg text-xs bg-pink-500 text-white font-bold shadow-sm">去支付</button>` : ''}
                                         
                                         <button class="cancelOrderBtn px-3 py-1 rounded-lg text-xs border border-red-200 text-red-500 hover:bg-red-50 font-bold" data-id="${order.id}">
                                            取消订单
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

            </div>
        </div>
    `;
}

// ==========================================
// 👇 [v1.3.6] 顾客专属：我的物流与订单页
// ==========================================
function renderMyOrdersPage(config) {
    const allOrders = getDataByType('order');
    // 过滤出当前用户的订单，且必须是包含商品 (items) 的订单
    const myOrders = allOrders.filter(o => 
        o.customerName === loggedInCustomerName && 
        o.items && o.items.some(i => i.type === 'product')
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // 最新在最前

    return `
        <div class="animate-fade-in pb-24 max-w-lg mx-auto">
            <h2 class="text-2xl font-bold mb-6 text-center" style="color: ${config.primary_action_color};">
                📦 我的商品订单
            </h2>

            ${myOrders.length === 0 ? `
                <div class="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <span class="text-4xl">🛒</span>
                    <p class="mt-4 text-gray-500 font-bold">暂无购买记录</p>
                    <button onclick="currentView='services'; renderApp()" class="mt-2 text-pink-500 hover:underline">去逛逛</button>
                </div>
            ` : `
                <div class="space-y-6">
                    ${myOrders.map(order => {
                        // 状态翻译
                        let statusBadge = '';
                        let actionsHtml = '';
                        
                        if (order.status === 'pending_payment') {
                            statusBadge = `<span class="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">💳 待支付</span>`;
                            actionsHtml = `
                                <button onclick="window.showUploadProofModal(getDataByType('order').find(o => o.id === '${order.id}'))" 
                                    class="w-full bg-pink-500 text-white py-2 rounded-lg text-xs font-bold shadow-md hover:bg-pink-600 mt-3">
                                    📤 上传付款凭证 (Pay Now)
                                </button>
                                <button class="w-full mt-2 text-gray-400 text-xs hover:text-red-500" onclick="alert('取消订单功能开发中...')">取消订单</button>
                            `;
                        }
                        // 🆕 已提交凭证，待商家确认
                        else if (order.paymentStatus === 'paid_verify') {
                            statusBadge = `<span class="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold">🕵️ 待商家核实</span>`;
                            actionsHtml = `
                                <div class="mt-2 p-2 bg-orange-50 rounded border border-orange-100 text-xs text-orange-700">
                                    <p><strong>流水号:</strong> ${order.proofRef || '-'}</p>
                                    <p>您的付款正在审核中，请耐心等待。</p>
                                </div>
                            `;
                        }
                        // 📅 待处理
                        if (order.status === 'pending') {
                            statusBadge = `<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">⏳ 等待商家发货</span>`;
                            actionsHtml = `<p class="text-xs text-gray-400 mt-2">商家正在配货中...</p>`;
                        } 
                        // 🚚 已发货 / 已完成 (但顾客还没确认收货)
                        else if (order.status === 'completed' && !order.customerReceived) {
                            statusBadge = `<span class="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">🚚 商家已发货</span>`;
                            actionsHtml = `
                                <div class="flex gap-2 mt-3">
                                    <button onclick="window.confirmOrderReceived('${order.id}')" class="flex-1 bg-green-500 text-white py-2 rounded-lg text-xs font-bold shadow-md hover:bg-green-600">
                                        ✅ 我已收到货
                                    </button>
                                    <button onclick="window.requestOrderRefund('${order.id}')" class="flex-1 border border-red-200 text-red-500 py-2 rounded-lg text-xs font-bold hover:bg-red-50">
                                        💸 申请退款/售后
                                    </button>
                                </div>
                            `;
                        }
                        // ✅ 交易成功 (双向确认)
                        else if (order.status === 'completed' && order.customerReceived) {
                            statusBadge = `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">🌟 交易成功</span>`;
                            actionsHtml = `<p class="text-xs text-green-600 mt-2 font-bold">感谢您的购买！</p>`;
                        }
                        // 💸 退款中
                        else if (order.status === 'refund_requested') {
                            statusBadge = `<span class="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold">⚠️ 退款申请中</span>`;
                            actionsHtml = `<p class="text-xs text-red-400 mt-2">请等待商家联系您处理售后。</p>`;
                        }
                        else if (order.status === 'cancelled') {
                            statusBadge = `<span class="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">🚫 已取消</span>`;
                        }

                        // 物流信息
                        const trackingInfo = order.trackingNumber 
                            ? `<div class="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 flex justify-between items-center">
                                 <span>🚚 物流单号: <strong class="select-all font-mono text-sm">${order.trackingNumber}</strong></span>
                                 <button onclick="navigator.clipboard.writeText('${order.trackingNumber}'); showToast('已复制单号')" class="text-blue-400 hover:text-blue-600">📋</button>
                               </div>` 
                            : '';

                        return `
                            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                                <div class="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
                                    <div class="text-xs text-gray-400">
                                        <p>单号: ${order.receiptNumber || '-'}</p>
                                        <p>${new Date(order.createdAt).toLocaleString()}</p>
                                    </div>
                                    ${statusBadge}
                                </div>

                                <div class="space-y-2 mb-3">
                                    ${order.items.map(item => `
                                        <div class="flex justify-between text-sm">
                                            <span class="text-gray-700 font-bold">${item.name} <span class="text-gray-400 text-xs">x${item.quantity}</span></span>
                                            <span class="text-gray-900 font-mono">RM${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                                
                                <div class="flex justify-between items-center pt-2 border-t border-dashed border-gray-200">
                                    <span class="text-xs font-bold text-gray-500">支付方式: ${order.paymentMethod || '-'}</span>
                                    <span class="text-lg font-bold" style="color: ${config.primary_action_color};">RM${order.totalAmount}</span>
                                </div>

                                ${trackingInfo}
                                ${actionsHtml}
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
}

// 辅助函数：顾客确认收货 & 申请退款
window.confirmOrderReceived = async (orderId) => {
    if(!confirm("确认您已经收到商品且无误吗？确认后将无法退款。")) return;
    
    const orders = getDataByType('order');
    const order = orders.find(o => o.id === orderId);
    if(order) {
        await updateRecord(order, { customerReceived: true, receivedAt: new Date().toISOString() });
        showToast('🎉 交易完成！');
        renderApp();
    }
};

window.requestOrderRefund = async (orderId) => {
    const reason = prompt("请输入退款/售后原因：");
    if(!reason) return;

    const orders = getDataByType('order');
    const order = orders.find(o => o.id === orderId);
    if(order) {
        await updateRecord(order, { status: 'refund_requested', refundReason: reason });
        showToast('✅ 申请已提交，请等待商家联系');
        renderApp();
    }
};

// ==========================================
// 👇 [v1.3.6] 个人档案 (支持点击头像上传)
// ==========================================
function renderProfile(config, bookings) {
    const customerAccount = getDataByType('customer_account').find(acc => acc.username === loggedInCustomerName);
    if (!customerAccount) return '';

    const currentAvatar = customerAccount.avatar || customerAccount.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInCustomerName)}&background=random&color=fff&size=150`;
    
    return `
        <div class="space-y-6 max-w-md mx-auto pb-20">
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                <div class="relative group cursor-pointer" onclick="document.getElementById('avatarInput').click()">
                    <img src="${currentAvatar}" 
                         class="w-28 h-28 rounded-full border-4 border-pink-50 shadow-md object-cover group-hover:opacity-80 transition-opacity">
                    <div class="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="text-white text-2xl">📷</span>
                    </div>
                    <input type="file" id="avatarInput" accept="image/*" class="hidden" onchange="window.handleAvatarUpload(this)">
                </div>
                
                <h2 class="mt-4 text-2xl font-bold text-gray-800">${loggedInCustomerName}</h2>
                <p class="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full mt-2">点击头像更换照片</p>
            </div>

            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <h3 class="font-bold text-gray-800 border-b pb-2 mb-4">基本资料</h3>
                
                <div class="flex justify-between items-center py-2 border-b border-gray-50">
                    <span class="text-gray-500 text-sm">手机号</span>
                    <span class="font-mono font-bold text-gray-700">${customerAccount.phone || '未绑定'}</span>
                </div>
                
                <div class="flex justify-between items-center py-2 border-b border-gray-50">
                    <span class="text-gray-500 text-sm">电子邮箱</span>
                    <span class="text-gray-700 text-sm">${customerAccount.email || '-'}</span>
                </div>

                <div class="py-2 border-b border-gray-50">
                    <div class="flex justify-between items-start">
                        <span class="text-gray-500 text-sm shrink-0">收货地址</span>
                        <span class="text-gray-700 text-sm text-right max-w-[200px] break-words">${customerAccount.address || '<span class="text-gray-300">未填写</span>'}</span>
                    </div>
                </div>

                <div class="flex justify-between items-center py-2 border-b border-gray-50">
                    <span class="text-gray-500 text-sm">注册时间</span>
                    <span class="font-mono text-gray-700 text-sm">${customerAccount.createdAt ? new Date(customerAccount.createdAt).toLocaleDateString() : '-'}</span>
                </div>
                
                ${getDiscountSettings().enable_membership ? `
                    <div class="flex justify-between items-center py-2">
                        <span class="text-gray-500 text-sm">会员等级</span>
                        <div>${getMembershipBadge(customerAccount.membershipLevel, config)}</div>
                    </div>
                ` : ''}

                <div class="pt-4">
                     <button id="editProfileBtn" class="w-full py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow font-bold text-white"
                         style="background: ${config.primary_action_color};">
                         ✏️ 编辑详细资料
                     </button>
                </div>
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

    // ↩️ 恢复待办 (后悔药功能 - 升级版)
    document.querySelectorAll('.revertBookingBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const b = bookings.find(i => i.id === btn.dataset.id);
            if (b) {
                // 👇 改为调用新的智能处理函数
                window.handleRevertBooking(config, b);
            }
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
                default_courier: document.getElementById('defaultCourier').value,
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

// ==========================================
// 👇 [v1.3.6 Fix] 编辑客户弹窗 (补全缺失函数)
// ==========================================
function showEditCustomerModal(config, customerId) {
    const customer = getDataByType('customer_account').find(c => c.id === customerId);
    if (!customer) {
        showToast('❌ 找不到该客户数据');
        return;
    }

    const settings = getDiscountSettings(); // 获取设置，判断会员开关

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <h3 class="mb-6 text-xl font-bold" style="color: ${config.primary_action_color};">
                编辑客户资料
            </h3>
            
            <form id="editCustomerForm" class="space-y-4">
                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-500">用户名 (不可改)</label>
                    <input type="text" value="${customer.username}" disabled 
                        class="w-full px-4 py-3 rounded-lg bg-gray-100 text-gray-500 font-bold cursor-not-allowed border-2 border-gray-100">
                </div>

                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-500">电话号码</label>
                    <input type="tel" id="editCustPhone" required value="${customer.phone || ''}"
                        onchange="this.value = cleanPhoneNumber(this.value)"
                        class="w-full px-4 py-3 rounded-lg border-2 focus:border-green-500 outline-none font-bold text-gray-700">
                </div>
                
                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-500">电子邮箱</label>
                    <input type="email" id="editCustEmail" value="${customer.email || ''}"
                        class="w-full px-4 py-3 rounded-lg border-2 focus:border-pink-500 outline-none font-bold text-gray-700">
                </div>

                <div style="display: ${settings.enable_membership ? 'block' : 'none'}">
                    <label class="block mb-1 text-xs font-bold text-gray-500">会员等级 (人工调整)</label>
                    <select id="editCustLevel" class="w-full px-4 py-3 rounded-lg border-2 font-bold text-gray-700 bg-white">
                        <option value="bronze" ${customer.membershipLevel==='bronze'?'selected':''}>🥉 铜牌 (Bronze)</option>
                        <option value="silver" ${customer.membershipLevel==='silver'?'selected':''}>🥈 银牌 (Silver)</option>
                        <option value="gold" ${customer.membershipLevel==='gold'?'selected':''}>🥇 金牌 (Gold)</option>
                        <option value="platinum" ${customer.membershipLevel==='platinum'?'selected':''}>💎 铂金 (Platinum)</option>
                    </select>
                </div>

                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-500">当前积分</label>
                    <input type="number" id="editCustPoints" value="${customer.points || 0}" min="0"
                        class="w-full px-4 py-3 rounded-lg border-2 focus:border-purple-500 outline-none font-bold text-purple-600">
                </div>

                <div class="flex gap-3 pt-4">
                    <button type="button" id="cancelEditCustBtn" class="flex-1 py-3 rounded-lg font-bold border-2 text-gray-500 hover:bg-gray-50">
                        取消
                    </button>
                    <button type="submit" class="flex-1 py-3 rounded-lg font-bold text-white shadow-md"
                        style="background: ${config.primary_action_color};">
                        保存修改
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updates = {
            phone: cleanPhoneNumber(document.getElementById('editCustPhone').value),
            email: document.getElementById('editCustEmail').value,
            points: parseInt(document.getElementById('editCustPoints').value) || 0
        };

        // 如果开启了会员制，才更新等级
        if (settings.enable_membership) {
            updates.membershipLevel = document.getElementById('editCustLevel').value;
        }

        await updateRecord(customer, updates);
        showToast('✅ 客户资料已更新');
        modal.remove();
        renderApp(); // 刷新列表
    });

    document.getElementById('cancelEditCustBtn').addEventListener('click', () => modal.remove());
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
// 👇 [v1.3.6 Beta] 编辑个人资料 (支持改名 + 数据迁移)
// ==========================================
function showEditProfileModal(config, customer) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm';
    const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/847/847969.png'; 
    
    modal.innerHTML = `
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in border-t-4" style="border-color: ${config.primary_action_color};">
            <div class="p-6 text-center border-b border-gray-100">
                <h3 class="text-xl font-bold text-gray-800">编辑个人资料</h3>
                <p class="text-xs text-gray-400 mt-1">手机与邮箱为唯一凭证</p>
            </div>
            
            <form id="editProfileForm" class="p-6 space-y-4">
                <div class="flex flex-col items-center mb-2">
                    <div class="relative group cursor-pointer" id="avatarDropZone">
                        <div class="w-24 h-24 rounded-full overflow-hidden border-4 shadow-md bg-gray-100 ring-2 ring-offset-2 ring-gray-100">
                            <img id="avatarPreview" src="${customer.avatar || customer.avatarUrl || defaultAvatar}" class="w-full h-full object-cover">
                        </div>
                        <div class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span class="text-white text-xs font-bold">📷 更换</span>
                        </div>
                    </div>
                    <input type="file" id="avatarFileInput" accept="image/*" style="display: none;">
                    <input type="hidden" id="avatarBase64" value="${customer.avatar || customer.avatarUrl || ''}">
                </div>

                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-700 uppercase">用户名 (昵称)</label>
                    <input type="text" id="editProfileUsername" required value="${customer.username}"
                        class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-800">
                    <p class="text-[10px] text-gray-400 mt-1 pl-1">修改昵称后，您的历史订单会自动关联到新名字。</p>
                </div>

                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-700 uppercase">WhatsApp / 电话 (唯一)</label>
                    <div class="relative">
                        <input type="tel" id="editProfilePhone" required value="${customer.phone || ''}"
                            onchange="this.value = cleanPhoneNumber(this.value)"
                            class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-green-500 focus:outline-none bg-green-50 font-bold text-gray-800">
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-lg">📱</span>
                    </div>
                </div>

                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-700 uppercase">电子邮箱 (唯一)</label>
                    <div class="relative">
                        <input type="email" id="editProfileEmail" required value="${customer.email}"
                            class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-800">
                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-lg">📧</span>
                    </div>
                </div>

                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-700 uppercase">收货地址</label>
                    <textarea id="editProfileAddress" rows="2" placeholder="请输入完整地址..."
                        class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-800 text-sm">${customer.address || ''}</textarea>
                </div>
                
                <div>
                    <label class="block mb-1 text-xs font-bold text-gray-700 uppercase">新密码 (选填)</label>
                    <input type="password" id="editProfilePassword" placeholder="不修改请留空"
                        class="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-pink-500 focus:outline-none bg-gray-50 font-bold text-gray-800">
                </div>
                
                <div class="flex gap-3 pt-2">
                    <button type="button" id="cancelEditProfileBtn" class="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">取消</button>
                    <button type="submit" class="flex-1 py-3 rounded-xl text-white font-bold shadow-lg transform active:scale-95 transition-all"
                        style="background: ${config.primary_action_color};">保存修改</button>
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
        if (file) openCropperModal(file, (base64) => { preview.src = base64; hiddenInput.value = base64; }, true);
    });

    // 提交逻辑 (🔥 核心修改：数据搬家)
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const oldUsername = customer.username; // 记住旧名字
        const newUsername = document.getElementById('editProfileUsername').value.trim();
        const newPhone = cleanPhoneNumber(document.getElementById('editProfilePhone').value);
        const newEmail = document.getElementById('editProfileEmail').value.trim();
        const newAddress = document.getElementById('editProfileAddress').value.trim();
        const newPassword = document.getElementById('editProfilePassword').value;
        const newAvatar = document.getElementById('avatarBase64').value;

        if (!newUsername || !newEmail) return showToast('用户名和邮箱不能为空');

        const allCustomers = getDataByType('customer_account');

        // 1. 检查手机号冲突 (排除自己)
        const phoneConflict = allCustomers.find(c => c.phone === newPhone && c.id !== customer.id);
        if (phoneConflict) return showToast('❌ 该手机号已被其他账号使用');

        // 2. 检查邮箱冲突 (排除自己)
        const emailConflict = allCustomers.find(c => c.email.toLowerCase() === newEmail.toLowerCase() && c.id !== customer.id);
        if (emailConflict) return showToast('❌ 该邮箱已被其他账号使用');

        // 3. 检查用户名冲突 (虽然是昵称，为了避免混淆，最好也不要重复，或者你可以允许重复)
        const nameConflict = allCustomers.find(c => c.username.toLowerCase() === newUsername.toLowerCase() && c.id !== customer.id);
        if (nameConflict) return showToast('❌ 该昵称太受欢迎了，换一个吧');

        // ✅ 准备更新数据
        const updates = {
            username: newUsername,
            phone: newPhone,
            email: newEmail,
            address: newAddress,
            avatar: newAvatar
        };
        if (newPassword && newPassword.length >= 4) updates.password = newPassword;

        // 4. 执行更新
        await updateRecord(customer, updates);

        // 🔥 5. 关键步骤：数据大搬家 (Cascade Update)
        // 如果改了名字，必须把该用户所有的订单、预约、评价里的名字都改成新的
        if (newUsername !== oldUsername) {
            console.log(`🔄 检测到改名: ${oldUsername} -> ${newUsername}，正在迁移数据...`);
            
            // A. 更新预约 (Bookings)
            const bookings = getDataByType('booking').filter(b => b.customerName === oldUsername);
            for (const b of bookings) {
                await updateRecord(b, { customerName: newUsername });
            }

            // B. 更新订单 (Orders)
            const orders = getDataByType('order').filter(o => o.customerName === oldUsername);
            for (const o of orders) {
                await updateRecord(o, { customerName: newUsername });
            }

            // C. 更新评价 (Ratings)
            const ratings = getDataByType('rating').filter(r => r.username === oldUsername);
            for (const r of ratings) {
                await updateRecord(r, { username: newUsername });
            }

            // D. 更新通知 (Notifications)
            // 暂时没有绑定名字的通知逻辑，略过

            // E. 更新当前登录会话
            loggedInCustomerName = newUsername;
            // 更新 SessionStorage 防止刷新后跳回旧名字或登出
            const sessionStr = sessionStorage.getItem('gembrow_session');
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                session.username = newUsername;
                sessionStorage.setItem('gembrow_session', JSON.stringify(session));
            }
            
            showToast(`✅ 改名成功！已为您迁移 ${bookings.length + orders.length} 条历史记录`);
        } else {
            showToast('✅ 个人资料已更新');
        }

        modal.remove();
        renderApp();
    });

    document.getElementById('cancelEditProfileBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
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
// 👇 [v1.3.5] 购物车弹窗 (升级版：含支付方式 & 单号)
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
                
                <div class="mb-4 pt-4 border-t border-gray-100">
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-2">支付方式 (Payment Method)</label>
                    <select id="cartPaymentMethod" class="w-full p-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700 focus:border-pink-500 outline-none bg-white">
                        <option value="TNG">🔵 TNG eWallet</option>
                        <option value="Bank Transfer">🏦 银行转账 (Bank Transfer)</option>
                        <option value="COD">🚚 货到付款 (COD)</option>
                        <option value="Store Pickup">🏪 到店自取 (Pay at Store)</option>
                    </select>
                </div>

                <div class="flex justify-between items-center pt-2 mb-6">
                    <span style="font-size: ${config.font_size * 1.1}px; font-weight: 700;">总计:</span>
                    <span style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.secondary_action_color};">RM${total}</span>
                </div>
                
                <button id="checkoutBtn" class="w-full btn-primary py-3 rounded-lg font-bold shadow-md"
                    style="background: ${config.secondary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                    提交订单 (Place Order)
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

        const payMethod = document.getElementById('cartPaymentMethod').value;
        const receiptNo = generateReceiptNumber();
        const now = new Date().toISOString();
        
        // 1. 如果是 COD，流程不变 (直接待发货)
        if (payMethod === 'COD' || payMethod === 'Store Pickup') {
            await createRecord({
                type: 'order',
                customerName: loggedInCustomerName,
                items: cart,
                totalAmount: total,
                paymentMethod: payMethod,
                paymentStatus: 'unpaid', // 货到才付
                receiptNumber: receiptNo,
                status: 'pending', // 待发货
                createdAt: now,
                isOnline: true
            });
            
            // 清空购物车
            const customers = getDataByType('customer_account');
            const me = customers.find(c => c.username === loggedInCustomerName);
            if (me) await updateRecord(me, { cart: [] });
            cart = []; 
            
            showToast(`✅ 订单已提交！单号: ${receiptNo}`);
            modal.remove();
            renderApp();
            return;
        }

        // 2. 如果是 TNG / Bank (需要上传凭证)
        // 先生成一个 "pending_payment" 状态的订单
        await createRecord({
            type: 'order',
            customerName: loggedInCustomerName,
            items: cart,
            totalAmount: total,
            paymentMethod: payMethod, // 这里暂时存大类，后面细分
            paymentStatus: 'pending_proof', // 关键状态：待上传凭证
            receiptNumber: receiptNo,
            status: 'pending_payment', // 关键状态：待支付
            createdAt: now,
            isOnline: true
        });

        // 清空购物车
        const customers = getDataByType('customer_account');
        const me = customers.find(c => c.username === loggedInCustomerName);
        if (me) await updateRecord(me, { cart: [] });
        cart = []; 
        
        modal.remove();

        // 3. 立即引导去上传凭证
        // 我们利用 confirm 引导用户跳转
        if(confirm(`🎉 订单已创建！单号: ${receiptNo}\n\n⚠️ 请立即支付并上传凭证以便商家接单。\n\n点击 [确定] 前往支付页面。`)) {
            currentView = 'myorders';
            renderApp();
            // 延时一点点，自动打开刚才那个单子的支付弹窗 (体验优化)
            setTimeout(() => {
                const orders = getDataByType('order');
                const justNowOrder = orders.find(o => o.receiptNumber === receiptNo);
                if(justNowOrder) window.showUploadProofModal(justNowOrder);
            }, 500);
        } else {
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
// 👇 [v1.3.6 Beta 1] 收银台 (修复 TNG 选中状态)
// ==========================================
function showCashierModal(config, appointment = null) {
    const allServices = getDataByType('service');
    const allProducts = getDataByType('product');
    const allOrders = getDataByType('order');
    const settings = getDiscountSettings();
    
    // 初始化
    let customerName = '';
    let customerPhone = '';
    let itemsToPay = [];
    let manualAdjustment = 0; 
    let mobileActiveTab = 'bill';
    
    // 支付状态
    let selectedMethod = null; // 'TNG' or 'Cash'
    let isPaymentDone = false;
    let savedOrderObject = null;
    
    if (appointment) {
        customerName = appointment.customerName;
        customerPhone = appointment.customerPhone || '-';
        itemsToPay.push({
            id: appointment.serviceId || 'srv_temp',
            name: `(预约) ${appointment.serviceName}`, 
            price: parseFloat(appointment.totalAmount || 0), 
            quantity: 1, type: 'service', isOriginal: true 
        });
    } else {
        if (window.cart && window.cart.length > 0) {
            customerName = loggedInCustomerName || 'Walk-in Guest';
            const acc = getDataByType('customer_account').find(c => c.username === customerName);
            customerPhone = acc ? acc.phone : '-';
            itemsToPay = window.cart.map(item => ({...item, isOriginal: true}));
        } else {
            showToast('购物车是空的！');
            return;
        }
    }

    let finalItems = [...itemsToPay]; 
    let mergedOrderIds = [];
    let addQty = 1;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-0 md:p-6 bg-black/60 backdrop-blur-sm';
    
    const renderContent = () => {
        // === 成功页 ===
        if (isPaymentDone) {
            modal.innerHTML = `
                <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 text-center animate-scale-in border-t-8 border-gray-800">
                    <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-4xl">✅</span>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-1">收款成功!</h3>
                    <p class="text-gray-500 mb-6">单号: ${savedOrderObject.receiptNumber}</p>
                    <p class="text-4xl font-bold text-gray-900 mb-8">RM${parseFloat(savedOrderObject.totalAmount).toFixed(2)}</p>
                    
                    <div class="space-y-3">
                        <button id="successPrintBtn" class="w-full py-3 rounded-xl font-bold text-gray-700 border-2 border-gray-200 hover:border-gray-800 hover:bg-gray-50 flex items-center justify-center gap-2">
                            🖨️ 打印收据
                        </button>
                        <button id="successWABtn" class="w-full py-3 rounded-xl font-bold text-white bg-green-500 hover:bg-green-600 shadow-md flex items-center justify-center gap-2">
                            📱 发送 WhatsApp
                        </button>
                        <button onclick="document.querySelector('.modal-backdrop').remove(); renderApp()" class="w-full py-3 rounded-xl font-bold text-gray-400 hover:text-gray-600 mt-4">
                            关闭
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('successPrintBtn').addEventListener('click', () => {
                if(savedOrderObject && typeof showReceiptModal === 'function') showReceiptModal(config, savedOrderObject);
            });
            document.getElementById('successWABtn').addEventListener('click', () => {
                window.sendReceiptByWhatsApp(customerPhone, savedOrderObject.receiptNumber, savedOrderObject.totalAmount);
            });
            return;
        }

        // === 收银主界面 ===
        const itemsTotal = finalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const finalTotal = itemsTotal + parseFloat(manualAdjustment);
        const cleanName = customerName.trim().toLowerCase();
        
        const pickupOrders = allOrders.filter(o => {
            const targetName = (o.customerName || '').trim().toLowerCase();
            return targetName === cleanName && (o.paymentMethod === 'Store Pickup' || o.paymentMethod === 'COD') && o.status === 'pending' && !mergedOrderIds.includes(o.id);
        });

        const serviceOptions = allServices.map(s => `<option value="service|${s.id}|${s.name}|${s.price}">💆‍♀️ ${s.name} (RM${s.price})</option>`).join('');
        const productOptions = allProducts.map(p => {
            const stock = parseInt(p.stock||0);
            return `<option value="product|${p.id}|${p.name}|${p.price}" ${stock<=0?'disabled':''}>📦 ${p.name} (RM${p.price}) ${stock<=0?'[缺货]':''}</option>`;
        }).join('');

        const leftPanelClass = mobileActiveTab === 'add' ? 'flex' : 'hidden md:flex';
        const rightPanelClass = mobileActiveTab === 'bill' ? 'flex' : 'hidden md:flex';
        const tabActive = "bg-gray-800 text-white shadow-md";
        const tabInactive = "bg-gray-100 text-gray-500";

        modal.innerHTML = `
            <div class="bg-white w-full h-full md:h-[90vh] md:max-w-5xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up border border-gray-200">
                <div class="md:hidden p-2 flex gap-2 border-b bg-white z-20 shrink-0">
                    <button onclick="window.setMobileTab('add')" class="flex-1 py-2 rounded-lg font-bold text-sm ${mobileActiveTab === 'add' ? tabActive : tabInactive}">🛒 加购</button>
                    <button onclick="window.setMobileTab('bill')" class="flex-1 py-2 rounded-lg font-bold text-sm ${mobileActiveTab === 'bill' ? tabActive : tabInactive}">🧾 结账</button>
                    <button onclick="document.querySelector('.modal-backdrop').remove()" class="px-3 rounded-lg bg-gray-100 text-gray-400 font-bold">✕</button>
                </div>

                <div class="${leftPanelClass} w-full md:w-5/12 bg-gray-50 border-r border-gray-200 flex-col h-full overflow-hidden">
                    <div class="p-4 border-b border-gray-200 bg-white hidden md:block"><h3 class="font-bold text-lg text-gray-800">🛒 添加项目</h3></div>
                    <div class="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
                        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <select id="posAddItemSelect" class="w-full p-2.5 rounded-lg border-2 border-gray-200 focus:border-pink-500 outline-none mb-3 font-bold text-gray-700 text-sm">
                                <option value="">👇 点击选择...</option>
                                <optgroup label="📦 商品产品">${productOptions}</optgroup>
                                <optgroup label="💆‍♀️ 服务项目">${serviceOptions}</optgroup>
                            </select>
                            <div class="flex gap-2">
                                <div class="flex items-center border-2 rounded-lg bg-gray-50 h-10">
                                    <button onclick="window.adjustPosAddQty(-1)" class="px-3 font-bold text-gray-500 hover:text-pink-600 rounded-l-lg">-</button>
                                    <input id="posAddQtyInput" type="number" value="${addQty}" class="w-10 text-center bg-transparent font-bold outline-none text-sm" readonly>
                                    <button onclick="window.adjustPosAddQty(1)" class="px-3 font-bold text-gray-500 hover:text-green-600 rounded-r-lg">+</button>
                                </div>
                                <button id="posAddItemBtn" class="flex-1 bg-gray-800 text-white font-bold rounded-lg shadow text-sm hover:bg-black">+ 加入</button>
                            </div>
                        </div>
                        ${pickupOrders.length > 0 ? `
                            <div class="bg-orange-50 p-4 rounded-xl border-2 border-orange-200 animate-pulse-slow">
                                <div class="flex justify-between items-start mb-2"><h4 class="font-bold text-orange-800 text-sm">🕵️ 发现待自取订单</h4><span class="bg-orange-200 text-orange-800 text-xs px-2 py-0.5 rounded-full font-bold">${pickupOrders.length} 单</span></div>
                                <button id="posMergeBtn" class="w-full py-2 bg-orange-500 text-white rounded-lg font-bold text-sm shadow hover:bg-orange-600">➕ 合并结账</button>
                            </div>` : ''}
                        <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                            <label class="block text-xs font-bold text-gray-400 mb-2 uppercase">⚖️ 调整/折扣</label>
                            <div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">RM</span><input type="number" id="posAdjustmentInput" value="${manualAdjustment}" placeholder="0" class="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-pink-100 focus:border-pink-500 outline-none font-bold text-gray-700 text-sm"></div>
                        </div>
                    </div>
                </div>

                <div class="${rightPanelClass} w-full md:w-7/12 flex-col h-full relative bg-white">
                    <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50 shrink-0">
                        <div><p class="text-xs text-blue-400 font-bold uppercase mb-1">Customer</p><h2 class="text-xl font-bold text-blue-900 leading-none">${customerName}</h2></div>
                        <button onclick="document.querySelector('.modal-backdrop').remove()" class="hidden md:flex w-8 h-8 rounded-full bg-white text-gray-400 hover:text-red-500 font-bold shadow-sm items-center justify-center">✕</button>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-white">
                        ${finalItems.length === 0 ? `<div class="h-full flex flex-col items-center justify-center opacity-30"><span class="text-6xl mb-4">🧾</span><p>暂无项目</p></div>` : finalItems.map((item, index) => `
                            <div class="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:border-pink-200 shadow-sm bg-white">
                                <div class="flex-1 min-w-0 pr-2">
                                    <div class="flex items-center gap-2 mb-1"><span class="text-xs px-1.5 py-0.5 rounded font-bold ${item.type==='service'?'bg-purple-100 text-purple-600':'bg-blue-100 text-blue-600'}">${item.type==='service'?'服务':'商品'}</span>${item.fromOrderId?'<span class="text-[10px] bg-orange-100 text-orange-600 px-1 rounded">自取</span>':''}<h4 class="font-bold text-gray-800 truncate text-sm">${item.name}</h4></div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div class="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-7"><button onclick="window.updatePosItemQty(${index}, -1)" class="w-6 h-full text-gray-500 hover:text-red-500 font-bold">-</button><span class="w-6 text-center text-xs font-bold text-gray-700">${item.quantity}</span><button onclick="window.updatePosItemQty(${index}, 1)" class="w-6 h-full text-gray-500 hover:text-green-500 font-bold">+</button></div>
                                    <div class="text-right w-20"><p class="font-bold text-gray-800 text-sm">RM${(item.price * item.quantity).toFixed(2)}</p>${!item.isOriginal && !item.fromOrderId ? `<button onclick="window.updatePosItemQty(${index}, -999)" class="text-[10px] text-red-400 hover:text-red-600">删除</button>` : ''}</div>
                                </div>
                            </div>`).join('')}
                    </div>

                    <div class="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10 shrink-0">
                        <div class="flex justify-between items-end mb-4">
                            <div><p class="text-xs font-bold text-gray-400 uppercase">TOTAL AMOUNT</p><p class="text-[10px] text-gray-400">应收总额</p></div>
                            <div class="text-right">${parseFloat(manualAdjustment)!==0?`<p class="text-xs text-pink-500 font-bold mb-1">含调整: RM${manualAdjustment}</p>`:''}<span class="text-3xl font-bold text-gray-900 tracking-tight">RM${finalTotal.toFixed(2)}</span></div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 mb-4">
                            <button onclick="window.selectPaymentMethod('TNG')" 
                                class="py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${selectedMethod==='TNG' ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}">
                                <span>🔵</span> TNG
                            </button>
                            <button onclick="window.selectPaymentMethod('Cash')" 
                                class="py-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all ${selectedMethod==='Cash' ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-100' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}">
                                <span>💵</span> Cash
                            </button>
                        </div>

                        <button id="finalConfirmBtn" 
                            class="w-full py-3.5 rounded-xl font-bold text-white shadow-lg text-lg transition-all flex items-center justify-center gap-2 ${selectedMethod ? 'bg-gray-800 hover:bg-black transform active:scale-[0.98]' : 'bg-gray-400 cursor-not-allowed'}" 
                            ${!selectedMethod ? 'disabled' : ''}>
                            ${selectedMethod ? `✅ 确认收款 RM${finalTotal.toFixed(2)}` : '请选择支付方式'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        window.setMobileTab = (tab) => { mobileActiveTab = tab; renderContent(); }
        window.adjustPosAddQty = (c) => { const n = addQty+c; if(n>=1) {addQty=n; document.getElementById('posAddQtyInput').value=addQty;} }
        window.updatePosItemQty = (i, c) => { if(c===-999) finalItems.splice(i,1); else {const n=finalItems[i].quantity+c; if(n>=1) finalItems[i].quantity=n;} renderContent(); }
        
        // 🔥 修复：选中支付方式的逻辑
        window.selectPaymentMethod = (method) => {
            // 如果点的是 TNG，且配置了二维码
            if (method === 'TNG' && settings.tng_qr_url) {
                // 1. 弹出大图
                showQrPaymentCheck(settings.tng_qr_url, finalTotal, () => {
                    // 2. 扫码弹窗关闭时的回调：
                    // 这里我们不直接提交，而是把 TNG 设为选中状态
                    selectedMethod = 'TNG';
                    renderContent(); // 重新渲染，让按钮变色
                });
            } else {
                // 如果是 Cash，或者没有二维码
                selectedMethod = method;
                renderContent();
            }
        };

        // 绑定其他事件
        document.getElementById('posAddItemBtn').addEventListener('click', () => {
            const val = document.getElementById('posAddItemSelect').value;
            if (!val) return showToast('请先选择项目');
            const [type, id, name, price] = val.split('|');
            const existing = finalItems.find(i => i.id === id && !i.isOriginal && !i.fromOrderId);
            if(existing) existing.quantity+=addQty; else finalItems.push({id, name, price:parseFloat(price), quantity:addQty, type, isAdded:true});
            addQty=1; if(window.innerWidth<768) mobileActiveTab='bill'; renderContent();
        });

        const mergeBtn = document.getElementById('posMergeBtn');
        if (mergeBtn) mergeBtn.addEventListener('click', () => {
            pickupOrders.forEach(o => { o.items.forEach(i => finalItems.push({...i, price:parseFloat(i.price), fromOrderId:o.id})); mergedOrderIds.push(o.id); });
            if(window.innerWidth<768) mobileActiveTab='bill'; renderContent(); showToast('✅ 已合并自取单');
        });

        document.getElementById('posAdjustmentInput').addEventListener('change', (e) => { manualAdjustment = e.target.value || 0; renderContent(); });

        // ⚡️ 最终确认逻辑
        const confirmBtn = document.getElementById('finalConfirmBtn');
        if(confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                if(!selectedMethod) return;
                confirmBtn.innerHTML = '⏳ 提交中...';
                confirmBtn.disabled = true;
                await executeCheckout(selectedMethod, finalTotal);
            });
        }
    };

    // 写入数据库
    async function executeCheckout(method, finalTotal) {
        const receiptNo = generateReceiptNumber();
        savedOrderObject = {
            type: 'order', receiptNumber: receiptNo, customerName: customerName,
            items: finalItems, totalAmount: finalTotal, adjustment: manualAdjustment,
            paymentMethod: method, status: 'completed', paymentStatus: 'paid',
            completedAt: new Date().toISOString(), isWalkIn: true, 
            mergedFrom: mergedOrderIds.length > 0 ? mergedOrderIds : null 
        };

        await createRecord(savedOrderObject);

        // 回写单号给预约
        if (appointment) await updateRecord(appointment, { 
            status: 'completed', 
            completedAt: new Date().toISOString(), 
            paymentMethod: method, 
            totalAmount: finalTotal,
            receiptNumber: receiptNo // 👈 关联单号
        });

        // 还原合并单状态
        if (mergedOrderIds.length > 0) { 
            for (const oldId of mergedOrderIds) { 
                const o = allOrders.find(x => x.id === oldId); 
                if(o) await updateRecord(o, { 
                    status: 'completed', 
                    pickupStatus: 'merged_into_'+receiptNo, 
                    customerReceived: true 
                }); 
            }
        }
        
        // 扣库存
        const products = getDataByType('product');
        for (const item of finalItems) {
            if (item.type === 'product' || item.stock) {
                const p = products.find(prod => prod.id === item.id) || products.find(prod => prod.name === item.name);
                if (p) await updateRecord(p, { stock: Math.max(0, parseInt(p.stock||0) - item.quantity) });
            }
        }

        if (!appointment) window.cart = [];
        isPaymentDone = true;
        renderContent(); // 切换成功页
    }

    document.body.appendChild(modal);
    renderContent();
}

// ==========================================
// 👇 [v1.3.6 New] TNG 扫码弹窗
// ==========================================
function showQrPaymentCheck(qrUrl, amount, onCloseCallback) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-[90] p-4 bg-black/80 backdrop-blur-md';
    
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div class="p-4 flex items-center justify-center gap-2 border-b">
                <span class="text-blue-600 text-xl">🔵</span>
                <h3 class="font-bold text-gray-800">扫码支付 (Touch 'n Go)</h3>
            </div>
            
            <div class="p-8 flex flex-col items-center bg-gray-50">
                <div class="p-2 border-4 border-white rounded-xl bg-white shadow-sm mb-4">
                    <img src="${qrUrl}" class="w-56 h-56 object-cover rounded-lg">
                </div>
                
                <p class="text-gray-400 text-xs mb-1">请顾客使用 TNG eWallet 扫描</p>
            </div>
            
            <div class="p-4 bg-white border-t">
                <button id="qrCloseBtn" class="w-full py-3 rounded-lg font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                    关闭 / 已支付
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 点击“关闭/已支付”时，触发回调，让父页面变成选中状态
    document.getElementById('qrCloseBtn').addEventListener('click', () => {
        modal.remove();
        if(onCloseCallback) onCloseCallback();
    });
}

// ==========================================
// 👇 [v1.3.6 Beta] 顾客历史 (支持补打收据/看原因)
// ==========================================
function renderHistoryPage(config) {
    window.historyTab = window.historyTab || 'booking';
    window.historyFilter = window.historyFilter || 'all'; 

    const allBookings = getDataByType('booking');
    const allOrders = getDataByType('order');
    const allRatings = getDataByType('rating');

    // 筛选逻辑
    const filterFn = (item) => {
        if (window.historyFilter === 'all') return item.status === 'completed' || item.status === 'cancelled';
        return item.status === window.historyFilter;
    };

    const historyBookings = allBookings.filter(b => b.customerName === loggedInCustomerName && filterFn(b)).sort((a, b) => new Date(b.completedAt || b.cancelledAt) - new Date(a.completedAt || a.cancelledAt));
    const myOrders = allOrders.filter(o => o.customerName === loggedInCustomerName && filterFn(o)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return `
        <div class="animate-fade-in pb-20 max-w-lg mx-auto">
            <h2 class="mb-4 text-center text-2xl font-bold" style="color: ${config.primary_action_color};">
                📜 历史与账单
            </h2>

            <div class="flex justify-between items-center border-b border-gray-200 mb-6">
                <div class="flex gap-4">
                    <button onclick="window.historyTab='booking'; renderApp()" 
                        class="pb-3 font-bold transition-colors ${window.historyTab==='booking' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-400'}">
                        预约记录
                    </button>
                    <button onclick="window.historyTab='shopping'; renderApp()" 
                        class="pb-3 font-bold transition-colors ${window.historyTab==='shopping' ? 'text-pink-600 border-b-2 border-pink-600' : 'text-gray-400'}">
                        购物账单
                    </button>
                </div>
                <div class="pb-2">
                    <select onchange="window.historyFilter=this.value; renderApp()" class="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none text-gray-600">
                        <option value="all" ${window.historyFilter==='all'?'selected':''}>全部状态</option>
                        <option value="completed" ${window.historyFilter==='completed'?'selected':''}>✅ 已完成</option>
                        <option value="cancelled" ${window.historyFilter==='cancelled'?'selected':''}>🚫 已取消</option>
                    </select>
                </div>
            </div>

            <div style="display: ${window.historyTab === 'booking' ? 'block' : 'none'};">
                ${historyBookings.length === 0 ? `
                    <div class="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 opacity-60">
                        <p class="text-gray-500">暂无相关记录</p>
                    </div>
                ` : `
                    <div class="space-y-4">
                        ${historyBookings.map(b => {
                            const isRated = allRatings.some(r => r.bookingId === b.id);
                            const completedTime = b.completedAt ? new Date(b.completedAt).toLocaleString() : '-';
                            
                            return `
                            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden transition-all hover:shadow-md">
                                <div class="flex justify-between items-start mb-2">
                                    <div>
                                        <div class="font-bold text-gray-800 text-lg">${b.serviceName}</div>
                                        <div class="text-xs text-gray-400 mt-1">
                                            ${b.status === 'completed' ? `完成于: ${completedTime}` : `预约时间: ${b.appointmentDate} ${b.appointmentTime}`}
                                        </div>
                                    </div>
                                    <span class="px-2 py-1 rounded text-xs font-bold ${b.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-400'}">
                                        ${b.status === 'completed' ? '✅ 已完成' : '❌ 已取消'}
                                    </span>
                                </div>
                                
                                ${b.status === 'cancelled' ? `
                                    <div class="bg-red-50 p-2 rounded-lg text-xs text-red-500 mb-2 border border-red-100">
                                        <span class="font-bold">取消原因:</span> ${b.cancelReason || '未填写'}
                                    </div>
                                ` : ''}

                                <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                                    <span class="font-mono font-bold text-gray-600">RM${b.totalAmount || b.servicePrice || 0}</span>
                                    
                                    <div class="flex gap-2">
                                        ${b.status === 'completed' ? `
                                            <button onclick="showReceiptModal(elementSdk.config, getDataByType('booking').find(x => x.id === '${b.id}'))" 
                                                class="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                                                🎫 电子收据
                                            </button>
                                        ` : ''}

                                        ${b.status === 'completed' ? (isRated ? 
                                            `<span class="text-xs font-bold text-yellow-500 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-100">🌟 已评价</span>` : 
                                            `<button class="rateItemBtn px-4 py-1.5 rounded-lg text-xs font-bold bg-pink-50 text-pink-600 border border-pink-200 hover:bg-pink-100 transition-colors" 
                                                data-type="booking" data-id="${b.id}">
                                                ⭐ 去评价
                                             </button>`
                                        ) : ''}
                                    </div>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                `}
            </div>

            <div style="display: ${window.historyTab === 'shopping' ? 'block' : 'none'};">
                ${myOrders.length === 0 ? `
                    <div class="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 opacity-60">
                        <p class="text-gray-500">暂无相关记录</p>
                    </div>
                ` : `
                    <div class="space-y-4">
                        ${myOrders.map(o => `
                            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                                <div class="flex justify-between items-center mb-3">
                                    <span class="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">${o.receiptNumber || '无单号'}</span>
                                    <span class="text-xs font-bold ${o.status === 'completed' ? 'text-green-600' : 'text-red-400'}">
                                        ${o.status === 'completed' ? '已发货/完成' : '已取消'}
                                    </span>
                                </div>
                                
                                ${o.status === 'cancelled' ? `
                                    <div class="bg-red-50 p-2 rounded-lg text-xs text-red-500 mb-3 border border-red-100">
                                        <span class="font-bold">取消原因:</span> ${o.cancelReason || '未填写'}
                                    </div>
                                ` : ''}
                                
                                <div class="space-y-1 mb-3">
                                    ${o.items.map(item => `
                                        <div class="flex justify-between text-sm">
                                            <span class="text-gray-700">${item.name}</span>
                                            <span class="font-bold">x${item.quantity}</span>
                                        </div>
                                    `).join('')}
                                </div>

                                <div class="flex justify-between items-center pt-3 border-t border-dashed border-gray-200">
                                    <span class="text-xs text-gray-500">${o.paymentMethod || 'Cash'}</span>
                                    <div class="flex items-center gap-3">
                                        <span class="text-lg font-bold text-gray-800">RM${o.totalAmount}</span>
                                        
                                        ${o.status === 'completed' && o.receiptNumber ? `
                                            <button onclick="showReceiptModal(elementSdk.config, getDataByType('order').find(x => x.id === '${o.id}'))" 
                                                class="px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200">🎫</button>
                                        ` : ''}
                                    </div>
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
// 👇 [v1.3.5-Fix] 智能单号生成器 (扫描全库)
// ==========================================
function generateReceiptNumber() {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2); // 25
    const mm = (now.getMonth() + 1).toString().padStart(2, '0'); // 01
    const prefix = `MY-${yy}${mm}`; // 例如 MY-2501
    
    // 1. 获取预约里的单号
    const bookingReceipts = getDataByType('booking')
        .map(b => b.receiptNumber)
        .filter(r => r && r.startsWith(prefix));

    // 2. 获取零售订单里的单号
    const orderReceipts = getDataByType('order')
        .map(o => o.receiptNumber)
        .filter(r => r && r.startsWith(prefix));

    // 3. 合并并找出最大序号
    const allReceipts = [...bookingReceipts, ...orderReceipts];
    let maxSeq = 0;

    allReceipts.forEach(r => {
        // 取最后4位数字 (MY-2501xxxx)
        const seqStr = r.slice(-4);
        const seq = parseInt(seqStr);
        if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
        }
    });
    
    // 4. 最大号 + 1
    const nextSeq = (maxSeq + 1).toString().padStart(4, '0'); 
    return `${prefix}${nextSeq}`;
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

// ==========================================
// 👇 [v1.3.5] 老板处理线上订单 (带收款确认)
// ==========================================
window.completeOrderWithStock = async (orderId) => {
    const orders = getDataByType('order');
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // 1. 安全弹窗 (Safety Check)
    // 只有在老板点击"完成"时才触发
    const isConfirmed = confirm(
        `【收款确认】\n\n` +
        `单号: ${order.receiptNumber || '-'}\n` +
        `客户: ${order.customerName}\n` +
        `支付方式: ${order.paymentMethod || '未选择'}\n` +
        `金额: RM${order.totalAmount}\n\n` +
        `⚠️ 请确认：您是否已经收到款项 (或已安排COD发货)？\n` +
        `点击 [确定] 将扣减库存并计入今日营收。`
    );

    if (!isConfirmed) return;

    // 2. 扣减库存
    const products = getDataByType('product');
    let stockError = false;

    for (const item of order.items) {
        // 尝试用ID找，找不到用名字找(兼容旧数据)
        const product = products.find(p => p.id === item.id) || products.find(p => p.name === item.name);
        
        if (product) {
            if (product.stock < item.quantity) {
                alert(`❌ 无法完成！商品 [${product.name}] 库存不足 (剩 ${product.stock})`);
                stockError = true;
                break;
            }
            // 内存中扣减
            const newStock = product.stock - item.quantity;
            // 写入数据库
            await updateRecord(product, { stock: newStock });
        }
    }

    if (stockError) return;

    // 3. 更新订单状态
    const now = new Date().toISOString();
    await updateRecord(order, { 
        status: 'completed',
        paymentStatus: 'paid', // 标记为已付款
        completedAt: now       // 记录入账时间
    });

    showToast('✅ 订单已完成，库存已扣减！');
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
// 👇 [v1.3.5] 零售收银面板 (优化版：图片比例 & 布局宽度)
// ==========================================
window.retailCart = window.retailCart || []; 
window.retailCustomer = window.retailCustomer || null; 
window.retailCategoryFilter = window.retailCategoryFilter || 'all'; 

function renderRetailPad(config, services) {
    const products = getDataByType('product');
    const customers = getDataByType('customer_account');
    
    // 1. 合并与筛选
    let allItems = [];
    const markedProducts = products.map(p => ({ ...p, itemType: 'product' }));
    const markedServices = services.map(s => ({ ...s, itemType: 'service', stock: 9999 })); 

    if (window.retailCategoryFilter === 'product') {
        allItems = markedProducts;
    } else if (window.retailCategoryFilter === 'service') {
        allItems = markedServices;
    } else {
        allItems = [...markedProducts, ...markedServices];
    }

    const total = window.retailCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return `
        <div class="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)] min-h-[600px]">
            
            <div class="lg:w-3/4 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-4 border-b bg-gray-50 flex flex-col md:flex-row gap-3 justify-between items-center">
                    
                    <div class="flex gap-2 w-full md:w-auto flex-1">
                        <div class="relative flex-1">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                            <input type="text" id="retailSearch" placeholder="搜索商品/服务..." 
                                oninput="window.filterRetailProducts(this.value)"
                                class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-pink-500 focus:outline-none font-bold text-sm">
                        </div>
                    </div>
                    
                    <div class="flex gap-2 w-full md:w-auto justify-center">
                        <button onclick="window.retailCategoryFilter='all'; renderApp()" 
                            class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${window.retailCategoryFilter === 'all' ? `bg-gray-800 text-white shadow` : 'bg-white border text-gray-500 hover:bg-gray-50'}">
                            全部
                        </button>
                        <button onclick="window.retailCategoryFilter='product'; renderApp()" 
                            class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${window.retailCategoryFilter === 'product' ? `bg-pink-600 text-white shadow` : 'bg-white border text-gray-500 hover:bg-gray-50'}">
                            📦 商品
                        </button>
                        <button onclick="window.retailCategoryFilter='service'; renderApp()" 
                            class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${window.retailCategoryFilter === 'service' ? `bg-purple-600 text-white shadow` : 'bg-white border text-gray-500 hover:bg-gray-50'}">
                            💆‍♀️ 服务
                        </button>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
                    <div id="retailProductGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        ${allItems.map(item => {
                            const isService = item.itemType === 'service';
                            const stock = parseInt(item.stock || 0);
                            const isOOS = !isService && stock <= 0;
                            
                            return `
                                <div onclick="${isOOS ? '' : `window.addToRetailCart('${item.id}', '${item.itemType}')`}" 
                                     class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col relative group transition-all ${isOOS ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md hover:border-pink-300 active:scale-[0.98] duration-200'}">
                                    
                                    <div class="aspect-[4/3] w-full bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                                        <img src="${item.imageUrl || './assets/default_eye.png'}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                                        ${isService ? `<span class="absolute top-2 right-2 bg-purple-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">服务</span>` : ''}
                                        ${!isOOS && !isService ? `<span class="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">存: ${stock}</span>` : ''}
                                    </div>
                                    
                                    <h4 class="font-bold text-gray-800 text-sm truncate mb-1" title="${item.name}">${item.name}</h4>
                                    
                                    <div class="mt-auto flex justify-between items-center">
                                        <span class="font-bold text-pink-600 text-base">RM${parseFloat(item.price).toFixed(0)}<span class="text-xs">.00</span></span>
                                        ${isOOS ? 
                                            `<span class="text-[10px] font-bold px-2 py-1 rounded bg-red-100 text-red-600">缺货</span>` : 
                                            `<div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-pink-500 group-hover:text-white transition-colors text-lg font-bold">+</div>`
                                        }
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>

            <div class="lg:w-1/4 flex flex-col bg-white rounded-2xl shadow-xl border-t-4 border-l border-gray-200" style="border-top-color: ${config.primary_action_color};">
                
                <div class="p-4 border-b bg-yellow-50/50">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">当前会员</span>
                        ${window.retailCustomer ? `
                            <button onclick="window.retailCustomer=null; renderApp()" class="text-xs text-red-400 hover:text-red-600 font-bold">✕ 解绑</button>
                        ` : ''}
                    </div>
                    
                    ${window.retailCustomer ? `
                        <div class="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-yellow-200 shadow-sm">
                            <img src="${window.retailCustomer.avatar || 'https://via.placeholder.com/50'}" class="w-8 h-8 rounded-full object-cover border border-gray-100">
                            <div class="flex-1 min-w-0">
                                <div class="font-bold text-sm text-gray-800 truncate">${window.retailCustomer.username}</div>
                                <div class="text-xs text-yellow-600 font-bold">积分: ${window.retailCustomer.points}</div>
                            </div>
                        </div>
                    ` : `
                        <select onchange="window.selectRetailCustomer(this.value)" class="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 focus:outline-none focus:border-yellow-400 bg-white cursor-pointer">
                            <option value="">👤 散客 (Walk-in)</option>
                            ${customers.map(c => `<option value="${c.id}">👑 ${c.username}</option>`).join('')}
                        </select>
                    `}
                </div>

                <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-gray-50/30">
                    <div class="flex justify-between items-center px-1 mb-1">
                        <span class="text-xs font-bold text-gray-400">购物车 (${window.retailCart.length})</span>
                        <button onclick="window.retailCart=[]; renderApp()" class="text-[10px] text-red-400 hover:text-red-600 font-bold hover:underline">清空</button>
                    </div>

                    ${window.retailCart.length === 0 ? `
                        <div class="h-full flex flex-col items-center justify-center opacity-30 gap-2">
                            <span class="text-5xl grayscale">🛒</span>
                            <p class="text-xs font-bold">未选择项目</p>
                        </div>
                    ` : window.retailCart.map((item, idx) => `
                        <div class="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm group">
                            <div class="flex-1 min-w-0">
                                <div class="font-bold text-sm text-gray-700 truncate mb-0.5">
                                    ${item.name}
                                </div>
                                <div class="text-xs text-gray-400 font-mono">RM${item.price}</div>
                            </div>
                            <div class="flex items-center gap-2 pl-2">
                                <div class="flex items-center bg-gray-50 border rounded-lg h-7">
                                    <button onclick="window.updateRetailQty(${idx}, -1)" class="w-7 h-full text-gray-400 hover:text-red-500 font-bold transition-colors">-</button>
                                    <span class="w-6 text-center text-xs font-bold text-gray-700">${item.quantity}</span>
                                    <button onclick="window.updateRetailQty(${idx}, 1)" class="w-7 h-full text-gray-400 hover:text-green-500 font-bold transition-colors">+</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="p-4 bg-white border-t shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10">
                    <div class="flex justify-between items-end mb-4">
                        <div class="text-xs text-gray-400 font-bold uppercase">Total Amount</div>
                        <div class="text-2xl font-bold text-gray-800">
                            <span class="text-sm align-top text-gray-400 mr-0.5">RM</span>${total.toFixed(2)}
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="window.showRetailPaymentModal('TNG', ${total})" 
                            class="py-3 rounded-xl font-bold text-sm text-white shadow-md bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all ${window.retailCart.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
                            TNG
                        </button>
                        <button onclick="window.showRetailPaymentModal('Cash', ${total})" 
                            class="py-3 rounded-xl font-bold text-sm text-white shadow-md bg-green-600 hover:bg-green-700 active:scale-95 transition-all ${window.retailCart.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
                            Cash
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 👇 [v1.3.4] 零售逻辑辅助函数 (Helper Functions)
// ==========================================

// 1. 添加到购物车
window.addToRetailCart = (id, type) => {
    // 自动判断去哪个库找数据
    const source = type === 'service' ? getDataByType('service') : getDataByType('product');
    const item = source.find(i => i.id === id);
    if (!item) return;

    const existing = window.retailCart.find(i => i.id === id);
    
    // 如果是商品，检查库存
    if (type === 'product') {
        const currentQty = existing ? existing.quantity : 0;
        if (currentQty + 1 > parseInt(item.stock || 0)) {
            showToast(`⚠️ 库存不足！仅剩 ${item.stock}`);
            return;
        }
    }

    if (existing) {
        existing.quantity++;
    } else {
        window.retailCart.push({
            id: item.id,
            name: item.name,
            price: parseFloat(item.price),
            quantity: 1,
            type: type // 'product' or 'service'
        });
    }
    renderApp();
};

// 2. 更新数量
window.updateRetailQty = (index, change) => {
    const item = window.retailCart[index];
    if (!item) return;

    if (change === -999) { // 删除
        window.retailCart.splice(index, 1);
    } else {
        const newQty = item.quantity + change;
        
        // 检查库存 (如果是加的话)
        if (change > 0) {
            const products = getDataByType('product');
            const product = products.find(p => p.id === item.id);
            if (product && newQty > product.stock) {
                showToast(`⚠️ 库存不足`);
                return;
            }
        }

        if (newQty <= 0) {
            window.retailCart.splice(index, 1);
        } else {
            item.quantity = newQty;
        }
    }
    renderApp();
};

// 3. 搜索过滤
window.filterRetailProducts = (query) => {
    const grid = document.getElementById('retailProductGrid');
    if (!grid) return;
    const cards = grid.children;
    const lowerQ = query.toLowerCase();
    
    for (let card of cards) {
        const name = card.querySelector('h4').innerText.toLowerCase();
        if (name.includes(lowerQ)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    }
};

// 4. 选择会员
window.selectRetailCustomer = (customerId) => {
    if (!customerId) return;
    const customers = getDataByType('customer_account');
    window.retailCustomer = customers.find(c => c.id === customerId);
    renderApp();
};

// 5. 核心：零售结账
window.processRetailCheckout = async (method) => {
    if (window.retailCart.length === 0) return;
    
    showToast('⏳ 正在处理交易...');
    
    const config = window.elementSdk.config;
    const total = window.retailCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const receiptNo = generateReceiptNumber();
    const now = new Date().toISOString();
    
    // 1. 扣减库存
    const products = getDataByType('product');
    for (const item of window.retailCart) {
        const product = products.find(p => p.id === item.id);
        if (product) {
            await updateRecord(product, { stock: product.stock - item.quantity });
        }
    }

    // 2. 如果是 TNG，显示二维码
    if (method === 'TNG') {
        const settings = getDiscountSettings();
        if (settings.tng_qr_url) {
            showQrPopup(settings.tng_qr_url);
            // 注意：这里我们假设老板扫完码后，还是会回来点确认，
            // 但为了简化，我们先直接往下走创建订单逻辑，或者你可以把下面的逻辑移到二维码弹窗的“确认已收款”按钮里。
            // 为了流畅体验，这里直接生成订单，如果没收到钱，老板可以之后手动取消。
        }
    }

    // 3. 创建订单记录
    await createRecord({
        type: 'order',
        customerName: window.retailCustomer ? window.retailCustomer.username : 'Walk-in Guest',
        items: [...window.retailCart], // 复制一份，防止引用被清空
        totalAmount: total.toFixed(2),
        paymentMethod: method,
        status: 'completed', // 零售单直接完成
        receiptNumber: receiptNo,
        createdAt: now,
        completedAt: now,
        isRetail: true // 标记为零售单
    });

    // 4. 如果是会员，加积分 (1 RM = 1 分，或者按设置)
    if (window.retailCustomer) {
        const settings = getDiscountSettings();
        // 假设 RM 1 = 1 分 (你可以根据 points_to_rm_rate 反推，或者设一个 rm_to_points_rate)
        // 这里简单处理：消费 RM 1 得 1 分
        const pointsEarned = Math.floor(total);
        await updateRecord(window.retailCustomer, { 
            points: (window.retailCustomer.points || 0) + pointsEarned,
            lifetime_points: (window.retailCustomer.lifetime_points || 0) + pointsEarned 
        });
        showToast(`🎉 会员积分 +${pointsEarned}`);
    }

    showToast(`✅ 收款成功！单号: ${receiptNo}`);
    
    // 5. 清理现场
    window.retailCart = [];
    window.retailCustomer = null;
    renderApp();
};

// ==========================================
// 👇 [v1.3.5-Fix] 零售支付弹窗 (修复卡死 & 打印)
// ==========================================
window.showRetailPaymentModal = (method, totalAmount) => {
    if (window.retailCart.length === 0) return;

    const config = window.elementSdk.config;
    const settings = getDiscountSettings();
    
    // 1. 预生成单号
    const receiptNo = generateReceiptNumber(); 
    const now = new Date();

    // 2. 二维码区域
    const qrSection = (method === 'TNG' && settings.tng_qr_url) 
        ? `<div class="mb-4 p-2 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl inline-block">
               <img src="${settings.tng_qr_url}" class="w-48 h-48 object-cover rounded-lg">
               <p class="text-xs text-blue-500 font-bold mt-1">请扫描二维码</p>
           </div>`
        : '';

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4'; // z-50
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border-4" 
             style="border-color: ${method === 'TNG' ? '#3b82f6' : '#10b981'};">
            
            <div class="p-4 text-center border-b bg-gray-50">
                <h3 class="text-xl font-bold flex items-center justify-center gap-2" 
                    style="color: ${method === 'TNG' ? '#2563eb' : '#059669'};">
                    ${method === 'TNG' ? '🔵 TNG eWallet' : '💵 现金收款 (Cash)'}
                </h3>
                <p class="text-sm text-gray-500 font-mono mt-1">${receiptNo}</p>
            </div>

            <div class="p-6 text-center">
                ${qrSection}
                <div class="mb-6">
                    <p class="text-gray-400 text-xs font-bold uppercase mb-1">应收金额 (Total)</p>
                    <p class="text-4xl font-bold text-gray-800">RM${totalAmount.toFixed(2)}</p>
                </div>
            </div>

            <div class="p-4 bg-gray-50 border-t grid grid-cols-3 gap-3">
                <button id="retailPrintBtn" class="flex flex-col items-center justify-center py-2 rounded-xl bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 font-bold text-xs shadow-sm">
                    <span class="text-lg">🖨️</span> 打印单据
                </button>
                <button id="retailCancelBtn" class="flex flex-col items-center justify-center py-2 rounded-xl bg-white border border-red-200 text-red-500 hover:bg-red-50 font-bold text-xs shadow-sm">
                    <span class="text-lg">❌</span> 暂不结账
                </button>
                <button id="retailConfirmBtn" class="flex flex-col items-center justify-center py-2 rounded-xl text-white font-bold text-xs shadow-md col-span-1"
                    style="background: ${method === 'TNG' ? '#2563eb' : '#059669'};">
                    <span class="text-lg">✅</span> 确认收款
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // --- 事件绑定 ---

    // 1. 取消：只关闭弹窗，购物车保留
    document.getElementById('retailCancelBtn').addEventListener('click', () => {
        modal.remove();
        showToast('↩️ 交易未完成，可继续选购');
    });

    // 2. 打印：调用新的 Receipt Modal (不下单，仅预览)
    document.getElementById('retailPrintBtn').addEventListener('click', () => {
        // 构造预览数据
        const previewData = {
            receiptNumber: receiptNo,
            customerName: window.retailCustomer ? window.retailCustomer.username : 'Walk-in Guest',
            items: window.retailCart,
            totalAmount: totalAmount,
            paymentMethod: method,
            completedAt: now.toISOString()
        };
        
        // 🔥 关键：不要 modal.style.display = 'none'！
        // 直接叠加上去。showReceiptModal 内部要设置 z-index > 50
        showReceiptModal(config, previewData); 
    });

    // 3. 确认收款：真实写入数据库
    document.getElementById('retailConfirmBtn').addEventListener('click', async () => {
        const btn = document.getElementById('retailConfirmBtn');
        btn.innerHTML = '⏳ 处理中...';
        btn.disabled = true;

        await window.executeRetailTransaction(receiptNo, method, totalAmount, now);
        modal.remove();
    });
};

// ==========================================
// 👇 [v1.3.5] 真实的结算逻辑 (写库操作)
// ==========================================
window.executeRetailTransaction = async (receiptNo, method, totalAmount, dateObj) => {
    // 1. 扣减库存 (只扣商品，服务不扣)
    const products = getDataByType('product');
    for (const item of window.retailCart) {
        if (item.type === 'product') {
            const product = products.find(p => p.id === item.id);
            if (product) {
                await updateRecord(product, { stock: product.stock - item.quantity });
            }
        }
    }

    // 2. 创建订单记录
    await createRecord({
        type: 'order',
        customerName: window.retailCustomer ? window.retailCustomer.username : 'Walk-in Guest',
        items: [...window.retailCart],
        totalAmount: totalAmount.toFixed(2),
        paymentMethod: method,
        status: 'completed',
        receiptNumber: receiptNo,
        createdAt: dateObj.toISOString(),
        completedAt: dateObj.toISOString(),
        isRetail: true 
    });

    // 3. 积分逻辑
    if (window.retailCustomer) {
        const pointsEarned = Math.floor(totalAmount);
        await updateRecord(window.retailCustomer, { 
            points: (window.retailCustomer.points || 0) + pointsEarned,
            lifetime_points: (window.retailCustomer.lifetime_points || 0) + pointsEarned 
        });
        showToast(`🎉 会员积分 +${pointsEarned}`);
    }

    showToast(`✅ 交易完成！单号: ${receiptNo}`);
    
    // 4. 只有在这里才清空购物车
    window.retailCart = [];
    window.retailCustomer = null;
    renderApp();
};

// ==========================================
// 👇 [v1.3.6 Final] 商家发货弹窗 (强制单号 + 商家自送)
// ==========================================
function showFulfillOrderModal(config, order) {
    const products = getDataByType('product');
    const settings = getDiscountSettings(); 
    let stockIssues = [];
    
    // 1. 库存检查
    order.items.forEach(item => {
        const p = products.find(prod => prod.id === item.id) || products.find(prod => prod.name === item.name);
        if (p) {
            const currentStock = parseInt(p.stock || 0);
            if (item.quantity > currentStock) {
                stockIssues.push(`❌ ${item.name}: 需 ${item.quantity} / 存 ${currentStock}`);
            }
        }
    });

    const hasStockIssue = stockIssues.length > 0;
    
    // 2. 物流列表 (加入“商家自送”)
    const couriers = [
        'J&T', 'PosLaju', 'GDEX', 'NinjaVan', 'ShopeeXpress', 'DHL', 
        'CityLink', 'Lalamove', 'GrabExpress', 
        'Shop Delivery (商家自送)', // 👈 新增这个
        'Other'
    ];
    const defaultCourier = settings.default_courier || '';

    // 3. 构建凭证显示 HTML (保持不变)
    let proofHtml = '';
    if (order.proofRef || order.proofImageName) {
        proofHtml = `
            <div class="bg-orange-50 p-4 rounded-xl border-2 border-orange-200 mb-4">
                <div class="flex items-center gap-2 mb-2 border-b border-orange-200 pb-2">
                    <span class="text-xl">🕵️</span>
                    <h4 class="font-bold text-orange-900 text-sm">顾客已提交支付凭证</h4>
                </div>
                <div class="space-y-1 text-xs text-orange-800">
                    <div class="flex justify-between">
                        <span class="opacity-70">转账方式:</span>
                        <span class="font-bold">${order.paymentMethod}</span>
                    </div>
                    ${order.proofRef ? `<div class="flex justify-between"><span class="opacity-70">Ref No:</span><strong class="select-all">${order.proofRef}</strong></div>` : ''}
                    ${order.proofImageName ? `<div class="flex justify-between mt-1"><span class="opacity-70">截图:</span><span>📷 ${order.proofImageName}</span></div>` : ''}
                </div>
            </div>
        `;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border-4 border-purple-500">
            <div class="p-6 bg-purple-50 border-b border-purple-100">
                <h3 class="text-xl font-bold text-purple-900">📦 发货 / 核销确认</h3>
                <p class="text-xs text-purple-600 mt-1">单号: ${order.receiptNumber || '未生成'}</p>
            </div>
            
            <div class="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                
                <div class="p-3 rounded-lg ${hasStockIssue ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}">
                    <p class="text-xs font-bold uppercase mb-1 ${hasStockIssue ? 'text-red-600' : 'text-green-600'}">
                        ${hasStockIssue ? '⚠️ 库存不足 (Stock Alert)' : '✅ 库存充足 (Stock OK)'}
                    </p>
                    ${hasStockIssue ? `<p class="text-[10px] text-red-500 font-bold">🚫 无法发货！请先修改订单数量。</p>` : ''}
                </div>

                ${proofHtml}

                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">支付方式</label>
                    <select id="fulfillPaymentMethod" class="w-full px-4 py-2 rounded-lg border border-purple-200 font-bold text-gray-700 bg-gray-50"
                        ${(order.proofRef || order.proofImageName) ? 'disabled' : ''}>
                        <option value="Online Transfer" ${order.paymentMethod === 'Online Transfer' ? 'selected' : ''}>🏦 银行转账</option>
                        <option value="COD" ${order.paymentMethod === 'COD' ? 'selected' : ''}>🚚 货到付款 (COD)</option>
                        <option value="Cash" ${order.paymentMethod === 'Cash' ? 'selected' : ''}>💵 现金 (自取)</option>
                        <option value="TNG" ${order.paymentMethod === 'TNG' ? 'selected' : ''}>🔵 TNG eWallet</option>
                    </select>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <div class="col-span-1">
                        <label class="block text-xs font-bold text-gray-500 mb-1">物流公司</label>
                        <select id="fulfillCourier" class="w-full px-2 py-2 rounded-lg border focus:border-purple-500 outline-none text-sm font-bold bg-gray-50">
                            <option value="">选择...</option>
                            ${couriers.map(c => `<option value="${c}" ${c === defaultCourier ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-span-2">
                        <label class="block text-xs font-bold text-gray-500 mb-1">物流单号 <span class="text-red-500">*</span></label>
                        <input type="text" id="fulfillTracking" placeholder="必填..." 
                            class="w-full px-4 py-2 rounded-lg border focus:border-purple-500 outline-none">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">备注</label>
                    <input type="text" id="fulfillPaymentRef" placeholder="商家备注..." value="${order.proofRef || ''}" 
                        class="w-full px-4 py-2 rounded-lg border focus:border-purple-500 outline-none">
                </div>

                <div class="flex gap-3 mt-6">
                    <button onclick="document.querySelector('.modal-backdrop').remove()" class="flex-1 py-3 rounded-xl font-bold text-gray-500 border hover:bg-gray-50">取消</button>
                    <button id="confirmFulfillBtn" class="flex-1 py-3 rounded-xl font-bold text-white shadow-md transition-all ${hasStockIssue ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'}" ${hasStockIssue ? 'disabled' : ''}>
                        ✅ 确认发货
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 🔥 监听物流选择，自动处理“商家自送”
    const courierSelect = document.getElementById('fulfillCourier');
    const trackingInput = document.getElementById('fulfillTracking');

    courierSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Shop Delivery (商家自送)') {
            trackingInput.value = '商家亲自配送'; // 自动填入
            trackingInput.disabled = true;       // 锁定不让改
            trackingInput.classList.add('bg-gray-100');
        } else {
            if (trackingInput.value === '商家亲自配送') trackingInput.value = ''; // 清空
            trackingInput.disabled = false;
            trackingInput.classList.remove('bg-gray-100');
        }
    });

    // 确认发货逻辑
    document.getElementById('confirmFulfillBtn').addEventListener('click', async () => {
        const courier = courierSelect.value;
        const trackingNo = trackingInput.value;
        const paymentRef = document.getElementById('fulfillPaymentRef').value;
        const finalMethod = document.getElementById('fulfillPaymentMethod').value;
        
        // 🛑 强制校验：必须选物流 + 必须填单号
        if (!courier) {
            alert('请选择物流公司！');
            return;
        }
        if (!trackingNo) {
            alert('请填写物流单号 (Tracking No)！');
            return;
        }

        const btn = document.getElementById('confirmFulfillBtn');
        btn.innerText = "⏳ 处理中...";
        btn.disabled = true;

        // 1. 扣库存
        for (const item of order.items) {
            const p = products.find(prod => prod.id === item.id) || products.find(prod => prod.name === item.name);
            if (p) {
                const newStock = Math.max(0, parseInt(p.stock) - item.quantity);
                await updateRecord(p, { stock: newStock });
            }
        }

        // 2. 更新订单
        await updateRecord(order, { 
            status: 'completed',
            paymentStatus: 'paid',
            completedAt: new Date().toISOString(),
            courier: courier,
            trackingNumber: trackingNo, 
            paymentReference: paymentRef,
            paymentMethod: finalMethod
        });

        showToast('✅ 发货成功！');
        modal.remove();
        renderApp();
    });
}

// ==========================================
// 👇 [v1.3.6 Fix] 上传支付凭证弹窗 (自动单号 + 修复截图)
// ==========================================
window.showUploadProofModal = (order) => {
    const settings = getDiscountSettings();
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    // 根据支付方式显示收款信息
    let bankInfoHtml = '';
    if (order.paymentMethod === 'TNG') {
        bankInfoHtml = `
            <div class="bg-blue-50 p-4 rounded-xl text-center mb-4 border border-blue-100">
                <p class="font-bold text-blue-800 mb-2">🔵 TNG eWallet</p>
                ${settings.tng_qr_url ? `<img src="${settings.tng_qr_url}" class="w-48 h-48 mx-auto rounded-lg mb-2 shadow-sm object-cover">` : '<div class="h-32 bg-gray-200 rounded flex items-center justify-center text-xs">商家未上传二维码</div>'}
                <p class="text-xs text-blue-600">请扫码支付 <strong>RM${order.totalAmount}</strong></p>
            </div>
        `;
    } else {
        bankInfoHtml = `
            <div class="bg-gray-50 p-4 rounded-xl text-center mb-4 border border-gray-200">
                <p class="font-bold text-gray-800 mb-2">🏦 银行转账信息</p>
                <div class="text-sm text-gray-600 space-y-1 select-all">
                    <p>银行: <strong>Public Bank</strong></p>
                    <p>账号: <strong>3234567890</strong></p>
                    <p>户名: <strong>GEM BROW BEAUTY</strong></p>
                </div>
                <p class="text-xs text-red-500 mt-3 font-bold">请转账 RM${order.totalAmount}</p>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border-4 border-pink-400">
            <div class="p-4 bg-pink-50 border-b border-pink-100 text-center">
                <h3 class="font-bold text-pink-900">📤 上传支付凭证</h3>
                <p class="text-xs text-pink-500 font-mono mt-1">Order No: ${order.receiptNumber}</p>
            </div>
            
            <div class="p-6">
                ${bankInfoHtml}

                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">转账流水号 / Ref No. <span class="text-red-500">*</span></label>
                        <input type="text" id="proofRefNo" placeholder="例如: 240103xxxx" 
                            class="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-pink-500 outline-none font-bold">
                        <p class="text-[10px] text-gray-400 mt-1">请填写 Bank Receipt 上的 Reference Number</p>
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold text-gray-500 mb-1">上传截图 (Screenshot)</label>
                        <div class="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
                            <input type="file" id="proofFile" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                            <div id="fileNameDisplay" class="text-xs text-gray-400 pointer-events-none">
                                <span class="text-2xl block mb-1">📷</span>
                                点击选择图片
                            </div>
                        </div>
                    </div>
                </div>

                <button id="submitProofBtn" class="w-full mt-6 py-3 rounded-xl font-bold text-white shadow-md bg-pink-500 hover:bg-pink-600 active:scale-95 transition-all">
                    ✅ 我已付款，提交审核
                </button>
                <button onclick="document.querySelector('.modal-backdrop').remove()" class="w-full mt-2 py-2 text-gray-400 text-xs font-bold hover:text-gray-600">
                    稍后再付
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 文件选择监听 (显示文件名)
    const fileInput = document.getElementById('proofFile');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    let selectedFileName = '';

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            selectedFileName = e.target.files[0].name;
            fileNameDisplay.innerHTML = `<span class="text-pink-600 font-bold">已选择: ${selectedFileName}</span>`;
        }
    });

    // 提交逻辑
    document.getElementById('submitProofBtn').addEventListener('click', async () => {
        const refNo = document.getElementById('proofRefNo').value;
        
        if (!refNo && !selectedFileName) {
            alert('请至少填写“流水号”或“上传截图”其中一项。');
            return;
        }

        const btn = document.getElementById('submitProofBtn');
        btn.innerHTML = '⏳ 提交中...';
        btn.disabled = true;

        // 更新订单状态
        await updateRecord(order, { 
            status: 'pending', // 变回 pending (让商家发货)
            paymentStatus: 'paid_verify', // 待核实
            proofRef: refNo || '无流水号',
            proofImageName: selectedFileName || null, // 保存文件名
            proofTime: new Date().toISOString()
        });

        showToast('✅ 凭证已提交！等待商家确认。');
        modal.remove();
        renderApp();
    });
};

// ==========================================
// 👇 [v1.3.6] 商家端：客户 360° 全景档案 (CRM)
// ==========================================
function showCustomerDetailModal(config, customer) {
    // 1. 数据挖掘 (Data Mining)
    const allBookings = getDataByType('booking');
    const allOrders = getDataByType('order');
    const allRatings = getDataByType('rating');

    // 筛选该客户数据
    const custBookings = allBookings.filter(b => b.customerName === customer.username && b.status === 'completed');
    const custOrders = allOrders.filter(o => o.customerName === customer.username && o.status === 'completed');
    const custRatings = allRatings.filter(r => r.customerName === customer.username);

    // 计算 LTV (总消费)
    const spendBooking = custBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount || b.servicePrice || 0), 0);
    const spendOrder = custOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
    const totalSpend = spendBooking + spendOrder;
    const totalVisits = custBookings.length + custOrders.length;

    // 计算平均评分
    const avgRating = custRatings.length > 0 
        ? (custRatings.reduce((sum, r) => sum + r.rating, 0) / custRatings.length).toFixed(1)
        : '暂无';

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    
    // 头像处理
    const avatarSrc = customer.avatar || customer.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(customer.username)}`;

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up border-4 border-purple-500 h-[80vh] flex flex-col">
            
            <div class="bg-purple-50 p-6 flex items-center gap-6 border-b border-purple-100 shrink-0">
                <div class="relative group">
                    <img src="${avatarSrc}" class="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover bg-white">
                    ${customer.avatar ? `
                        <button id="resetAvatarBtn" class="absolute -bottom-2 -right-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full shadow border border-red-200 hover:bg-red-200" title="删除违规头像">
                            🗑️ 删除
                        </button>
                    ` : ''}
                </div>
                
                <div class="flex-1">
                    <h3 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        ${customer.username}
                        <span class="text-sm px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                            ${customer.membershipLevel || 'Bronze'}
                        </span>
                    </h3>
                    <div class="flex gap-4 mt-2 text-sm text-gray-600">
                        <p>📞 ${customer.phone || '未绑定'}</p>
                        <p>💰 积分: ${customer.points || 0}</p>
                    </div>
                </div>

                <div class="text-right hidden md:block">
                    <p class="text-xs text-gray-400 uppercase font-bold">Total Spent (LTV)</p>
                    <p class="text-2xl font-bold text-purple-600">RM${totalSpend.toFixed(2)}</p>
                    <p class="text-xs text-gray-500">共消费 ${totalVisits} 次</p>
                </div>
            </div>

            <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                <div class="flex-1 p-6 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-gray-100 bg-white">
                    <h4 class="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <span>📜 消费记录</span>
                        <span class="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">${totalVisits}</span>
                    </h4>
                    
                    <div class="space-y-3">
                        ${[...custBookings, ...custOrders]
                            .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
                            .map(item => {
                                const isBooking = item.type === 'booking'; // 假设数据里有 type 字段区分，或者通过 receiptNumber 判断
                                // 这里简单判断：如果有 serviceName 就是服务
                                const isService = !!item.serviceName;
                                const date = new Date(item.completedAt || item.createdAt).toLocaleDateString();
                                const amount = item.totalAmount || item.servicePrice || 0;
                                
                                return `
                                    <div class="flex justify-between items-center text-sm p-2 rounded hover:bg-gray-50 border-b border-gray-50 last:border-0">
                                        <div>
                                            <div class="font-bold text-gray-700">
                                                ${isService ? '💅 ' + item.serviceName : '📦 商品订单'}
                                            </div>
                                            <div class="text-xs text-gray-400">${date} • ${item.receiptNumber || '-'}</div>
                                        </div>
                                        <div class="font-mono font-bold text-gray-600">RM${parseFloat(amount).toFixed(2)}</div>
                                    </div>
                                `;
                            }).join('') || '<p class="text-gray-400 text-sm text-center py-4">暂无消费记录</p>'}
                    </div>
                </div>

                <div class="w-full md:w-1/3 p-6 overflow-y-auto custom-scrollbar bg-gray-50">
                    <h4 class="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <span>⭐ 历史评价</span>
                        <span class="bg-yellow-100 text-yellow-600 text-xs px-2 py-0.5 rounded-full">Avg: ${avgRating}</span>
                    </h4>

                    <div class="space-y-3">
                        ${custRatings.length === 0 ? `
                            <div class="text-center py-8 opacity-50">
                                <span class="text-4xl grayscale">⭐</span>
                                <p class="text-xs mt-2">暂无评价</p>
                            </div>
                        ` : custRatings.map(r => `
                            <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                <div class="flex justify-between mb-1">
                                    <span class="text-yellow-500 text-sm font-bold">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
                                    <span class="text-[10px] text-gray-400">${new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p class="text-xs text-gray-600 italic">"${r.comment || '没写评语...'}"</p>
                                <p class="text-[10px] text-gray-400 mt-2 text-right">项目: ${r.serviceName || '未知'}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="p-4 bg-white border-t border-gray-100 flex justify-end">
                <button onclick="document.querySelector('.modal-backdrop').remove()" 
                    class="px-6 py-2 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">
                    关闭
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 删除头像逻辑
    const resetBtn = document.getElementById('resetAvatarBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm('⚠️ 确定要删除该用户的头像吗？\n\n如果头像包含不雅内容，请删除。删除后将恢复为默认头像。')) {
                await updateRecord(customer, { avatar: null, avatarUrl: null });
                showToast('✅ 头像已重置');
                modal.remove();
                renderApp(); // 刷新列表
            }
        });
    }
}

// ==========================================
// 👇 [v1.3.6 Final] 问题反馈弹窗 (Bug Report)
// ==========================================
function showFeedbackModal(config) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-[70] p-4';
    
    // 自动获取当前页面信息，方便定位 Bug
    const currentPage = currentView;
    const user = loggedInCustomerName || (currentMode === 'owner' ? 'Owner' : 'Guest');

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border-4 border-yellow-400">
            <div class="p-4 bg-yellow-50 border-b border-yellow-100 text-center">
                <h3 class="font-bold text-yellow-800 text-lg">🐞 帮助我们改进</h3>
                <p class="text-xs text-yellow-600">发现 Bug 或有新点子？请告诉我们！</p>
            </div>
            
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">反馈类型</label>
                    <div class="flex gap-2">
                        <label class="flex-1 cursor-pointer">
                            <input type="radio" name="fbType" value="bug" class="peer sr-only" checked>
                            <div class="py-2 text-center rounded-lg border-2 border-gray-200 text-gray-500 peer-checked:border-red-500 peer-checked:text-red-500 peer-checked:bg-red-50 font-bold transition-all">
                                🐛 出错了
                            </div>
                        </label>
                        <label class="flex-1 cursor-pointer">
                            <input type="radio" name="fbType" value="idea" class="peer sr-only">
                            <div class="py-2 text-center rounded-lg border-2 border-gray-200 text-gray-500 peer-checked:border-green-500 peer-checked:text-green-500 peer-checked:bg-green-50 font-bold transition-all">
                                💡 有建议
                            </div>
                        </label>
                        <label class="flex-1 cursor-pointer">
                            <input type="radio" name="fbType" value="other" class="peer sr-only">
                            <div class="py-2 text-center rounded-lg border-2 border-gray-200 text-gray-500 peer-checked:border-blue-500 peer-checked:text-blue-500 peer-checked:bg-blue-50 font-bold transition-all">
                                💬 其他
                            </div>
                        </label>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1">描述内容</label>
                    <textarea id="feedbackContent" rows="4" placeholder="请详细描述您遇到的问题，或您的想法..." 
                        class="w-full px-4 py-3 rounded-lg border-2 focus:border-yellow-400 focus:outline-none bg-gray-50"></textarea>
                </div>
                
                <div class="text-xs text-gray-400 bg-gray-100 p-2 rounded">
                    系统信息: ${user} @ ${currentPage}
                </div>

                <div class="flex gap-3 pt-2">
                    <button id="cancelFeedbackBtn" class="flex-1 py-3 rounded-xl font-bold text-gray-500 border border-gray-200 hover:bg-gray-50">取消</button>
                    <button id="submitFeedbackBtn" class="flex-1 py-3 rounded-xl font-bold text-white shadow-md bg-yellow-500 hover:bg-yellow-600">
                        🚀 发送反馈
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('submitFeedbackBtn').addEventListener('click', async () => {
        const content = document.getElementById('feedbackContent').value;
        const type = document.querySelector('input[name="fbType"]:checked').value;
        
        if (!content.trim()) {
            alert('请填写内容哦~');
            return;
        }

        // 保存到数据库 (feedback 表)
        await createRecord({
            type: 'feedback',
            feedbackType: type,
            content: content,
            reporter: user,
            page: currentPage,
            status: 'new', // new, read, fixed
            createdAt: new Date().toISOString()
        });

        showToast('✅ 收到！感谢您的反馈 ❤️');
        modal.remove();
        
        // 如果是老板，可以考虑刷新一下界面(如果有反馈列表页的话)
    });

    document.getElementById('cancelFeedbackBtn').addEventListener('click', () => modal.remove());
    // 点击背景关闭
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ==========================================
// 👇 [v1.3.6 New] 取消原因弹窗
// ==========================================
window.showCancelReasonModal = (bookingId) => {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-[80] p-4 bg-black/50';
    
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up border-t-4 border-red-500">
            <div class="p-5">
                <h3 class="font-bold text-lg text-gray-800 mb-4">🚫 取消预约原因</h3>
                
                <div class="space-y-3">
                    <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                        <input type="radio" name="cancelReason" value="顾客改期 (Reschedule)" class="accent-red-500 w-5 h-5">
                        <span class="text-sm font-bold text-gray-700">顾客改期 (Reschedule)</span>
                    </label>
                    <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                        <input type="radio" name="cancelReason" value="顾客没来 (No Show)" class="accent-red-500 w-5 h-5">
                        <span class="text-sm font-bold text-gray-700">顾客没来 (No Show)</span>
                    </label>
                    <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                        <input type="radio" name="cancelReason" value="店铺忙碌/休息 (Shop Busy)" class="accent-red-500 w-5 h-5">
                        <span class="text-sm font-bold text-gray-700">店铺忙碌/休息 (Shop Busy)</span>
                    </label>
                    <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                        <input type="radio" name="cancelReason" value="Other" class="accent-red-500 w-5 h-5" id="reasonOther">
                        <span class="text-sm font-bold text-gray-700">其他原因 (Other)</span>
                    </label>
                    
                    <textarea id="otherReasonInput" class="w-full p-2 border rounded-lg text-sm mt-2 hidden" placeholder="请输入具体原因..."></textarea>
                </div>

                <div class="flex gap-3 mt-6">
                    <button id="closeCancelModal" class="flex-1 py-2 text-gray-500 font-bold">暂不取消</button>
                    <button id="confirmCancelBtn" class="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold shadow-md hover:bg-red-600">确认取消</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 监听 "Other" 选项显示输入框
    const radios = modal.querySelectorAll('input[name="cancelReason"]');
    const otherInput = document.getElementById('otherReasonInput');
    
    radios.forEach(r => {
        r.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                otherInput.style.display = 'block';
                otherInput.focus();
            } else {
                otherInput.style.display = 'none';
            }
        });
    });

    // 确认取消
    document.getElementById('confirmCancelBtn').addEventListener('click', async () => {
        const selected = document.querySelector('input[name="cancelReason"]:checked');
        if (!selected) {
            alert('请选择一个原因');
            return;
        }
        
        let finalReason = selected.value;
        if (finalReason === 'Other') {
            finalReason = otherInput.value.trim();
            if (!finalReason) {
                alert('请填写其他原因');
                return;
            }
        }

        const booking = getDataByType('booking').find(b => b.id === bookingId);
        if (booking) {
            await updateRecord(booking, { 
                status: 'cancelled', 
                cancelledAt: new Date().toISOString(),
                cancelReason: finalReason // 👈 保存原因
            });
            showToast('🚫 预约已取消');
            modal.remove();
            renderApp();
        }
    });

    document.getElementById('closeCancelModal').addEventListener('click', () => modal.remove());
};

// ==========================================
// 👇 [v1.3.6 Fix] 财务报表专用打印函数
// ==========================================
window.printStats = function(dateRange) {
    // 1. 重新获取并过滤数据 (确保打印的是当前看到的)
    const allBookings = getDataByType('booking');
    const allOrders = getDataByType('order');
    const settings = getDiscountSettings(); // 获取店铺名

    let allTransactions = [];
    const processedReceipts = new Set(
        allOrders.filter(o => o.status === 'completed' && o.receiptNumber).map(o => o.receiptNumber)
    );

    // 合并预约
    allBookings.forEach(b => {
        if (b.status === 'completed' && (!b.receiptNumber || !processedReceipts.has(b.receiptNumber))) {
            allTransactions.push({
                rawDate: new Date(b.completedAt || `${b.appointmentDate}T${b.appointmentTime}`),
                receiptNo: b.receiptNumber || 'N/A',
                customer: b.customerName,
                type: 'Service',
                payment: b.paymentMethod || '-',
                summary: b.serviceName,
                amount: parseFloat(b.totalAmount || 0)
            });
        }
    });

    // 合并订单
    allOrders.forEach(o => {
        if (o.status === 'completed') {
            allTransactions.push({
                rawDate: new Date(o.completedAt || o.createdAt),
                receiptNo: o.receiptNumber || 'N/A',
                customer: o.customerName,
                type: o.isRetail ? 'Retail' : 'Order',
                payment: o.paymentMethod || '-',
                summary: o.items.map(i => `${i.name} x${i.quantity}`).join(', '),
                amount: parseFloat(o.totalAmount || 0)
            });
        }
    });

    // 时间筛选逻辑
    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString();
    
    let titleDate = '';
    let filteredData = allTransactions.filter(t => {
        const d = t.rawDate.toLocaleDateString();
        if (dateRange === 'today') { titleDate = `Today (${todayStr})`; return d === todayStr; }
        if (dateRange === 'yesterday') { titleDate = `Yesterday (${yesterdayStr})`; return d === yesterdayStr; }
        if (dateRange === 'month') { 
            titleDate = `This Month (${now.getFullYear()}-${now.getMonth()+1})`; 
            return t.rawDate.getMonth() === now.getMonth() && t.rawDate.getFullYear() === now.getFullYear(); 
        }
        titleDate = 'All History';
        return true;
    });

    // 排序
    filteredData.sort((a, b) => b.rawDate - a.rawDate);

    // 计算总计
    const totalRevenue = filteredData.reduce((sum, t) => sum + t.amount, 0);
    const totalCount = filteredData.length;
    const cashTotal = filteredData.filter(t => t.payment === 'Cash').reduce((sum, t) => sum + t.amount, 0);
    const tngTotal = filteredData.filter(t => t.payment === 'TNG').reduce((sum, t) => sum + t.amount, 0);

    // 2. 构建打印窗口 HTML
    const printWindow = window.open('', '', 'width=900,height=800');
    
    const htmlContent = `
        <html>
        <head>
            <title>Financial Report - ${titleDate}</title>
            <style>
                @page { size: A4; margin: 15mm; }
                body { font-family: 'Courier New', Courier, monospace; color: #000; padding: 20px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 20px; margin-bottom: 20px; }
                h1 { margin: 0; font-size: 24px; }
                .meta { font-size: 14px; margin-top: 5px; }
                
                .summary-box { display: flex; justify-content: space-between; margin-bottom: 20px; border: 1px solid #000; padding: 15px; }
                .sum-item { text-align: center; }
                .sum-val { font-size: 18px; font-weight: bold; display: block; }
                .sum-label { font-size: 12px; text-transform: uppercase; }

                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { text-align: left; border-bottom: 2px solid #000; padding: 8px 4px; }
                td { border-bottom: 1px solid #ddd; padding: 8px 4px; vertical-align: top; }
                tr { page-break-inside: avoid; } /* 防止行被切断 */
                
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                
                .footer { margin-top: 30px; text-align: center; font-size: 10px; border-top: 1px solid #ccc; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${settings.shop_name || 'Gem Brow Beauty'}</h1>
                <div class="meta">Financial Statement | ${titleDate}</div>
                <div class="meta">Printed: ${new Date().toLocaleString()}</div>
            </div>

            <div class="summary-box">
                <div class="sum-item">
                    <span class="sum-val">${totalCount}</span>
                    <span class="sum-label">Transactions</span>
                </div>
                <div class="sum-item">
                    <span class="sum-val">RM${totalRevenue.toFixed(2)}</span>
                    <span class="sum-label">Total Revenue</span>
                </div>
                <div class="sum-item">
                    <span class="sum-val">RM${cashTotal.toFixed(2)}</span>
                    <span class="sum-label">Cash</span>
                </div>
                <div class="sum-item">
                    <span class="sum-val">RM${tngTotal.toFixed(2)}</span>
                    <span class="sum-label">TNG</span>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th width="15%">Time</th>
                        <th width="15%">Receipt</th>
                        <th width="15%">Type</th>
                        <th width="20%">Customer</th>
                        <th width="20%">Details</th>
                        <th width="15%" class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(t => `
                        <tr>
                            <td>${t.rawDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td>${t.receiptNo}</td>
                            <td>${t.type}<br><span style="font-size:10px;color:#666">${t.payment}</span></td>
                            <td>${t.customer}</td>
                            <td>${t.summary}</td>
                            <td class="text-right font-bold">RM${t.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    ${filteredData.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:20px;">No records found.</td></tr>' : ''}
                </tbody>
            </table>

            <div class="footer">
                -- End of Report --<br>
                Powered by BeautyLoop SaaS
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

// ==========================================
// 👇 [v1.3.6 New] 商业收据弹窗 (Sales Receipt)
// ==========================================
function showReceiptModal(config, order) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-[80] p-4 bg-black/50 backdrop-blur-sm';
    
    const dateStr = new Date(order.completedAt || order.createdAt).toLocaleString();
    
    // 计算小计
    const itemsHtml = order.items.map(item => `
        <div class="flex justify-between text-xs mb-1 font-mono">
            <span>${item.name} <span class="text-[10px] text-gray-500">x${item.quantity}</span></span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="bg-white w-full max-w-[320px] shadow-2xl overflow-hidden animate-scale-in relative">
            
            <div id="receiptContent" class="p-6 bg-white text-gray-800">
                <div class="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                    <h2 class="font-bold text-xl uppercase tracking-wider mb-1">${config.app_title || 'BeautyLoop'}</h2>
                    <p class="text-[10px] text-gray-500">Sales Receipt</p>
                    <p class="text-[10px] text-gray-500 mt-1">${dateStr}</p>
                    <p class="text-[10px] font-mono mt-1">NO: ${order.receiptNumber}</p>
                </div>

                <div class="mb-4 text-xs">
                    <p><span class="text-gray-400">Customer:</span> ${order.customerName}</p>
                    <p><span class="text-gray-400">Payment:</span> ${order.paymentMethod}</p>
                </div>

                <div class="border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                    ${itemsHtml}
                </div>

                <div class="text-right space-y-1 mb-6">
                    ${order.adjustment ? `
                        <div class="flex justify-between text-xs text-gray-500">
                            <span>Adjustment</span>
                            <span>${parseFloat(order.adjustment).toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="flex justify-between font-bold text-lg">
                        <span>TOTAL</span>
                        <span>RM${parseFloat(order.totalAmount).toFixed(2)}</span>
                    </div>
                </div>

                <div class="text-center text-[10px] text-gray-400">
                    <p>Thank you for visiting!</p>
                    <p>Powered by BeautyLoop SaaS</p>
                </div>
            </div>

            <div class="bg-gray-900 p-4 flex gap-2 no-print">
                <button id="doPrintReceiptBtn" class="flex-1 bg-white text-black font-bold py-2 rounded text-sm hover:bg-gray-200">
                    🖨️ 打印 (Print)
                </button>
                <button onclick="document.querySelector('.modal-backdrop').remove()" class="px-4 py-2 border border-gray-600 text-gray-400 rounded text-sm font-bold hover:text-white">
                    ✕
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 打印逻辑
    document.getElementById('doPrintReceiptBtn').addEventListener('click', () => {
        const printContent = document.getElementById('receiptContent').innerHTML;
        const win = window.open('', '', 'width=400,height=600');
        win.document.write(`
            <html>
                <head>
                    <style>
                        body { font-family: 'Courier New', monospace; padding: 20px; text-align: center; }
                        .text-left { text-align: left; }
                        .text-right { text-align: right; }
                        .flex { display: flex; justify-content: space-between; }
                        .border-b { border-bottom: 1px dashed #000; margin: 10px 0; padding-bottom: 10px; }
                        .font-bold { font-weight: bold; }
                        h2 { margin: 0; }
                        p { margin: 2px 0; font-size: 12px; }
                    </style>
                </head>
                <body>
                    ${printContent}
                    <script>window.onload = function(){ window.print(); window.close(); }</script>
                </body>
            </html>
        `);
        win.document.close();
    });
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ==========================================
// 👇 [v1.3.6 Final Fix] 完美单据打印 (动态店名版)
// ==========================================
function showReceiptModal(config, item) {
    // 0. 获取店铺设置
    const settings = getDiscountSettings();
    const shopName = settings.shop_name || config.app_title || "Beauty Shop"; // 优先用设置的名字

    // 1. 准备数据
    const isBooking = item.serviceName !== undefined;
    const date = new Date(item.createdAt || item.appointmentDate);
    const receiptNo = item.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;
    const itemsList = isBooking 
        ? [{name: item.serviceName, price: item.servicePrice || item.totalAmount}] 
        : item.items;
    
    // 2. 打印专用函数
    const handlePrint = () => {
        const win = window.open('', '', 'width=400,height=600');
        win.document.write(`
            <html>
            <head>
                <title>Receipt ${receiptNo}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; color: #000; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                    .logo { font-size: 18px; font-weight: bold; margin-bottom: 5px; } /* 字体稍微调小一点适配长店名 */
                    .meta { font-size: 10px; margin-top: 5px; }
                    .item { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px; }
                    .divider { border-top: 1px dashed #000; margin: 10px 0; }
                    .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-top: 5px; }
                    .footer { text-align: center; font-size: 10px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">💎 ${shopName}</div> <div class="meta">Receipt: ${receiptNo}</div>
                    <div class="meta">Date: ${date.toLocaleString()}</div>
                    <div class="meta">Customer: ${item.customerName}</div>
                </div>

                <div>
                    ${itemsList.map(i => `
                        <div class="item">
                            <span>${i.name} ${i.quantity ? 'x'+i.quantity : ''}</span>
                            <span>RM${parseFloat(i.price).toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="divider"></div>

                <div class="total">
                    <span>TOTAL</span>
                    <span>RM${parseFloat(item.totalAmount).toFixed(2)}</span>
                </div>
                
                <div class="item" style="margin-top:5px; color:#666;">
                    <span>Payment</span>
                    <span>${item.paymentMethod || 'Cash'}</span>
                </div>

                <div class="footer">
                    Thank you for your visit!<br>
                    Please come again.
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        win.document.close();
    };

    // 3. 网页版弹窗 (预览)
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm';
    
    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div class="p-6 bg-gray-50 border-b text-center">
                <div class="text-4xl mb-2">✅</div>
                <h3 class="font-bold text-gray-800">交易成功</h3>
                <p class="text-xs text-gray-500">单据已生成</p>
            </div>
            
            <div class="p-6 space-y-2 font-mono text-sm bg-white">
                <div class="text-center font-bold mb-4 border-b border-dashed pb-2">${shopName}</div> <div class="flex justify-between font-bold">
                    <span>总金额</span>
                    <span class="text-xl text-pink-600">RM${parseFloat(item.totalAmount).toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-gray-500 text-xs">
                    <span>支付方式</span>
                    <span>${item.paymentMethod || 'Cash'}</span>
                </div>
                <div class="flex justify-between text-gray-500 text-xs">
                    <span>单号</span>
                    <span>${receiptNo}</span>
                </div>
            </div>

            <div class="p-4 bg-gray-50 grid grid-cols-2 gap-3">
                <button id="doPrintBtn" class="col-span-1 py-3 rounded-xl bg-gray-800 text-white font-bold shadow-md hover:bg-black flex items-center justify-center gap-2">
                    🖨️ 打印小票
                </button>
                <button onclick="document.querySelector('.modal-backdrop').remove()" class="col-span-1 py-3 rounded-xl border border-gray-300 text-gray-500 font-bold hover:bg-gray-100">
                    关闭
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    document.getElementById('doPrintBtn').onclick = () => {
        handlePrint();
    };
    
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ==========================================
// 👇 [v1.3.6 (Beta) Fix 2] 智能撤单系统 (修复价格清零问题)
// ==========================================
window.handleRevertBooking = async (config, booking) => {
    showConfirmModal(config, 
        `⚠️ 撤销警告：\n\n您正在撤销一笔 [已完成] 的交易！\n\n系统将自动执行：\n1. 恢复商品库存\n2. 还原被合并的“自取订单”\n3. 作废旧流水单\n\n确定要继续吗？`, 
        async () => {
            showToast('⏳ 正在回滚数据...');
            
            const allOrders = getDataByType('order');
            // 1. 寻找关联的订单
            const relatedOrder = allOrders.find(o => 
                (o.receiptNumber && o.receiptNumber === booking.receiptNumber) && 
                o.status === 'completed'
            );

            if (relatedOrder) {
                const products = getDataByType('product');
                
                // A. 恢复库存 (Inventory Restock)
                for (const item of relatedOrder.items) {
                    if (item.type === 'product') { 
                        const product = products.find(p => p.id === item.id) || products.find(p => p.name === item.name);
                        if (product) {
                            const currentStock = parseInt(product.stock || 0);
                            await updateRecord(product, { stock: currentStock + item.quantity });
                        }
                    }
                }

                // B. 还原被合并的订单 (Un-merge)
                if (relatedOrder.mergedFrom && relatedOrder.mergedFrom.length > 0) {
                    for (const mergedId of relatedOrder.mergedFrom) {
                        const originalOrder = allOrders.find(o => o.id === mergedId);
                        if (originalOrder) {
                            // 把它变回 Pending，这样收银台又能扫到了
                            await updateRecord(originalOrder, { 
                                status: 'pending',
                                pickupStatus: null,
                                customerReceived: false
                            });
                        }
                    }
                }

                // C. 作废当前大单
                await updateRecord(relatedOrder, { 
                    status: 'cancelled', 
                    cancelReason: '预约撤销回滚 (Auto Reverted)'
                });
            }

            // 2. 找回服务原价
            const services = getDataByType('service');
            const originalService = services.find(s => s.name === booking.serviceName);
            const restorePrice = originalService ? originalService.price : (booking.servicePrice || 0);

            // 3. 重置预约状态 (清空单号！)
            await updateRecord(booking, { 
                status: 'pending', 
                completedAt: null,
                receiptNumber: null, // 🔥 必须清空，否则下次结账不出新单号
                totalAmount: parseFloat(restorePrice), 
                paymentMethod: null
            });
            
            showToast('✅ 撤销成功！库存已恢复，合并单已还原。');
            renderApp();
        }
    );
};

// 发送 WhatsApp 收据
window.sendReceiptByWhatsApp = (phone, receiptNo, amount) => {
    if (!phone || phone.length < 5) return alert('顾客电话号码无效');
    // 格式化电话 (去掉非数字，确保 60 开头)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '60' + cleanPhone.substring(1);
    
    const text = `Hi! 感谢光临 GemBrow 💎\n您的收据: ${receiptNo}\n金额: RM${amount}\n期待下次为您服务！`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// ==========================================
// 👇 [v1.3.6 Fix] 消息中心 (支持点击查看详情)
// ==========================================
function showNotificationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm';
    
    const currentUser = currentMode === 'owner' ? 'admin' : loggedInCustomerName;
    const notifications = getDataByType('notification')
        .filter(n => n.targetUser === currentUser) 
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scale-in h-[80vh] flex flex-col">
            <div class="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                <h3 class="font-bold text-gray-800">🔔 消息中心</h3>
                <div class="flex gap-2">
                    ${notifications.length > 0 ? `<button onclick="window.markAllRead()" class="text-xs text-blue-600 font-bold hover:underline">全部已读</button>` : ''}
                    <button id="closeNotiModal" class="text-gray-400 hover:text-gray-600 text-xl font-bold px-2">×</button>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                ${notifications.length === 0 ? `
                    <div class="h-full flex flex-col items-center justify-center opacity-50 pb-20">
                        <span class="text-6xl mb-4">🔕</span>
                        <p class="text-sm font-bold text-gray-400">暂无新消息</p>
                    </div>
                ` : notifications.map(n => `
                    <div onclick="window.viewNotificationDetail('${n.id || n.version}')" 
                         class="p-4 rounded-xl border cursor-pointer relative group transition-all hover:shadow-md active:scale-[0.98]
                         ${n.isRead ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'}">
                        
                        ${!n.isRead ? `<div class="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>` : ''}
                        
                        <div class="flex justify-between items-start mb-1 pr-4">
                            <span class="font-bold text-sm ${n.isRead ? 'text-gray-600' : 'text-blue-900'}">${n.title}</span>
                        </div>
                        <p class="text-xs text-gray-500 mb-2 font-mono">${new Date(n.createdAt).toLocaleString()}</p>
                        <p class="text-xs ${n.isRead ? 'text-gray-400' : 'text-gray-700'} line-clamp-2 leading-relaxed">
                            ${n.message || n.content}
                        </p>
                        
                        <button onclick="event.stopPropagation(); window.deleteNotification('${n.id || n.version}')" 
                            class="absolute bottom-2 right-2 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="删除">
                            🗑️
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 关闭事件
    const close = () => modal.remove();
    document.getElementById('closeNotiModal').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    // 1. 查看详情 (并标记为已读)
    window.viewNotificationDetail = (id) => {
        let allData = JSON.parse(localStorage.getItem('gembrow_data') || '[]');
        const target = allData.find(item => item.type === 'notification' && (item.id === id || item.version == id));
        
        if (target) {
            // 标记为已读
            if (!target.isRead) {
                target.isRead = true;
                localStorage.setItem('gembrow_data', JSON.stringify(allData));
                renderApp(); // 刷新红点
            }

            // 弹出详情
            const detailModal = document.createElement('div');
            detailModal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-[60] p-6 bg-black/60 backdrop-blur-sm';
            detailModal.innerHTML = `
                <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scale-in p-6 border-t-4 border-blue-500">
                    <h3 class="text-lg font-bold text-gray-900 mb-2">${target.title}</h3>
                    <p class="text-xs text-gray-400 font-mono mb-4 border-b border-gray-100 pb-2">
                        ${new Date(target.createdAt).toLocaleString()}
                    </p>
                    <div class="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar">
                        ${target.message || target.content}
                    </div>
                    <button id="closeDetailBtn" class="w-full mt-6 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">
                        关闭
                    </button>
                </div>
            `;
            document.body.appendChild(detailModal);
            
            // 关闭详情后，刷新列表状态(变白)
            const closeDetail = () => {
                detailModal.remove();
                document.querySelector('.modal-backdrop').remove(); // 关掉旧列表
                showNotificationModal(); // 重新打开列表(已读状态更新)
            };
            
            document.getElementById('closeDetailBtn').addEventListener('click', closeDetail);
            detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetail(); });
        }
    };

    // 2. 删除单条
    window.deleteNotification = (id) => {
        let allData = JSON.parse(localStorage.getItem('gembrow_data') || '[]');
        const newData = allData.filter(item => {
            if (item.type !== 'notification') return true;
            return (item.id !== id && item.version != id);
        });
        localStorage.setItem('gembrow_data', JSON.stringify(newData));
        document.querySelector('.modal-backdrop').remove();
        showNotificationModal(); // 刷新
    };

    // 3. 全部已读
    window.markAllRead = () => {
        let allData = JSON.parse(localStorage.getItem('gembrow_data') || '[]');
        let hasChange = false;
        allData.forEach(item => {
            if (item.type === 'notification' && item.targetUser === currentUser && !item.isRead) {
                item.isRead = true;
                hasChange = true;
            }
        });
        if (hasChange) {
            localStorage.setItem('gembrow_data', JSON.stringify(allData));
            renderApp();
        }
        document.querySelector('.modal-backdrop').remove();
        showNotificationModal();
    };
}

// ==========================================
// 👇 [v1.3.6 Fix] 资源管理 Tab (修复动态图片显示)
// ==========================================
function renderAssetTabs(services, products, posts, config) {
    const activeTab = window.assetTab || 'services';

    let contentHtml = '';
    let addButtonText = '';

    if (activeTab === 'services') {
        addButtonText = '+ 添加服务';
        contentHtml = services.map(s => `
            <div class="p-3 flex justify-between items-center bg-white border border-gray-100 rounded-xl mb-2">
                <div class="flex items-center gap-3">
                    <img src="${s.imageUrl || './assets/default_eye.png'}" class="w-10 h-10 rounded object-cover bg-gray-100">
                    <div>
                        <div class="text-sm font-bold text-gray-700">${s.name}</div>
                        <div class="text-xs text-gray-400">RM${s.price}</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="editServiceBtn text-xs text-blue-500 font-bold px-2 py-1 bg-blue-50 rounded" data-id="${s.id}">编辑</button>
                    <button class="deleteServiceBtn text-xs text-red-400 font-bold px-2 py-1 bg-red-50 rounded" data-id="${s.id}">删除</button>
                </div>
            </div>
        `).join('');
    } else if (activeTab === 'products') {
        addButtonText = '+ 添加商品';
        contentHtml = products.map(p => `
            <div class="p-3 flex justify-between items-center bg-white border border-gray-100 rounded-xl mb-2">
                <div class="flex items-center gap-3">
                    <img src="${p.imageUrl || 'https://cdn-icons-png.flaticon.com/512/679/679922.png'}" class="w-10 h-10 rounded object-cover bg-gray-100">
                    <div>
                        <div class="text-sm font-bold text-gray-700">${p.name}</div>
                        <div class="text-[10px] ${p.stock < 5 ? 'text-red-500' : 'text-green-500'} font-bold">库存: ${p.stock}</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="editProductBtn text-xs text-blue-500 font-bold px-2 py-1 bg-blue-50 rounded" data-id="${p.id}">补货</button>
                    <button class="deleteProductBtn text-xs text-red-400 font-bold px-2 py-1 bg-red-50 rounded" data-id="${p.id}">下架</button>
                </div>
            </div>
        `).join('');
    } else if (activeTab === 'posts') {
        addButtonText = '+ 发布动态';
        contentHtml = posts.map(p => `
            <div class="p-3 flex justify-between items-center bg-white border border-gray-100 rounded-xl mb-2">
                <div class="flex items-center gap-3">
                    ${p.imageUrl 
                        ? `<img src="${p.imageUrl}" class="w-10 h-10 rounded object-cover bg-gray-100 border border-gray-200">` 
                        : `<span class="text-2xl w-10 text-center">📢</span>`
                    }
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-bold text-gray-700 truncate w-32 md:w-64">${p.postTitle}</div>
                        <div class="text-[10px] text-gray-400 truncate w-32 md:w-64">${p.postContent}</div>
                    </div>
                </div>
                <button class="deletePostBtn text-xs text-red-400 font-bold px-2 py-1 bg-red-50 rounded" data-id="${p.id}">删除</button>
            </div>
        `).join('');
    }

    return `
        <div class="pt-2">
             <div class="flex justify-between items-center mb-4">
                <div class="flex bg-gray-100 p-1 rounded-xl">
                    <button onclick="window.assetTab='services'; renderApp()" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab==='services' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">服务</button>
                    <button onclick="window.assetTab='products'; renderApp()" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab==='products' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">商品</button>
                    <button onclick="window.assetTab='posts'; renderApp()" class="px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab==='posts' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">动态</button>
                </div>
                
                <button onclick="window.handleAddAsset()" 
                    class="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:bg-opacity-90 transition-all flex items-center gap-1"
                    style="background: ${config.primary_action_color};">
                    ${addButtonText}
                </button>
             </div>

             <div class="max-h-[400px] overflow-y-auto custom-scrollbar">
                ${contentHtml || `<div class="text-center py-8 text-gray-400 text-xs">暂无数据</div>`}
             </div>
        </div>
    `;
}

// ==========================================
// 👇 [v1.3.6 Beta] 预约详情控制台 (修复逻辑闭环)
// ==========================================
function showOwnerAppointmentModal(config, booking) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm';
    
    // --- 1. 数据计算 ---
    const originalTime = booking.appointmentTime;
    const delay = booking.delayMinutes || 0;
    
    // 计算显示时间 (含延迟)
    let displayTime = originalTime;
    if (delay > 0) {
        const [h, m] = originalTime.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m + delay, 0);
        displayTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} (延+${delay}分)`;
    }

    // 计算服务时长 (如果已开始 或 已完成)
    let durationStr = '-';
    if (booking.startedAt) {
        const start = new Date(booking.startedAt);
        const end = booking.completedAt ? new Date(booking.completedAt) : new Date();
        const diffMins = Math.floor((end - start) / 1000 / 60);
        
        if (diffMins < 60) {
            durationStr = `${diffMins} 分钟`;
        } else {
            const h = Math.floor(diffMins / 60);
            const m = diffMins % 60;
            durationStr = `${h}小时 ${m}分钟`;
        }
    }

    // --- 2. 状态判断 (UI 区分) ---
    const isPending = booking.status === 'pending';
    const isServing = booking.status === 'serving';
    const isCompleted = booking.status === 'completed';
    const isCancelled = booking.status === 'cancelled';

    // 头部颜色
    let headerBg = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'; // 默认蓝 (待服务)
    let statusText = '⏳ 等待服务';
    
    if (isServing) {
        headerBg = 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // 绿 (服务中)
        statusText = '💇‍♀️ 正在服务中';
    } else if (isCompleted) {
        headerBg = 'linear-gradient(135deg, #64748b 0%, #475569 100%)'; // 灰 (已完成)
        statusText = '✅ 服务已完成';
    } else if (isCancelled) {
        headerBg = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'; // 红 (已取消)
        statusText = '🚫 预约已取消';
    }

    // --- 3. 构建 HTML ---
    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-scale-in relative">
            
            <div class="p-6 text-center text-white relative overflow-hidden" style="background: ${headerBg};">
                <h3 class="text-2xl font-bold relative z-10">${booking.customerName}</h3>
                <p class="text-sm opacity-90 relative z-10 font-mono">${booking.customerPhone || '无电话'}</p>
                <div class="mt-4 inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold border border-white/30 relative z-10">
                    ${statusText}
                </div>
                <div class="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full"></div>
            </div>

            <div class="p-6 space-y-4">
                <div class="flex justify-between border-b border-gray-100 pb-3">
                    <span class="text-gray-500 text-sm">预约项目</span>
                    <span class="font-bold text-gray-800 text-right w-40 truncate">${booking.serviceName}</span>
                </div>
                <div class="flex justify-between border-b border-gray-100 pb-3">
                    <span class="text-gray-500 text-sm">预约时间</span>
                    <span class="font-bold ${delay > 0 ? 'text-red-500' : 'text-gray-800'}">${displayTime}</span>
                </div>
                
                ${(isServing || isCompleted) ? `
                    <div class="flex justify-between border-b border-gray-100 pb-3">
                        <span class="text-gray-500 text-sm">服务耗时</span>
                        <span class="font-bold text-blue-600">${durationStr}</span>
                    </div>
                ` : ''}

                ${isCancelled ? `
                    <div class="bg-red-50 p-3 rounded-lg text-xs text-red-600">
                        <span class="font-bold">取消原因:</span> ${booking.cancelReason || '未填写'}
                    </div>
                ` : ''}
            </div>

            <div class="p-4 bg-gray-50" id="actionArea">
                </div>
        </div>
    `;

    document.body.appendChild(modal);

    // --- 4. 动态渲染按钮区域 ---
    const actionArea = document.getElementById('actionArea');

    function renderActions(mode = 'default') {
        let html = '';

        if (isCompleted) {
            // === 已完成：只显示关闭/小票 ===
            html = `
                <div class="grid grid-cols-2 gap-3">
                    <button id="receiptBtn" class="col-span-1 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold hover:bg-gray-300">🎫 补打小票</button>
                    <button id="closeModalBtn" class="col-span-1 py-3 rounded-xl border border-gray-300 text-gray-500 font-bold hover:bg-gray-100">关闭</button>
                </div>
            `;
        } else if (isCancelled) {
            // === 已取消：只显示关闭 ===
            html = `
                <button id="closeModalBtn" class="w-full py-3 rounded-xl border border-gray-300 text-gray-500 font-bold hover:bg-gray-100">关闭</button>
            `;
        } else if (mode === 'delay_select') {
            // === 延迟选项模式 (点击延迟后) ===
            html = `
                <p class="text-xs text-center text-gray-400 mb-2 font-bold">请选择推迟时间 (分钟)</p>
                <div class="grid grid-cols-3 gap-2 mb-2">
                    <button onclick="window.applyDelay(5)" class="py-2 rounded-lg bg-white border border-yellow-200 text-yellow-700 font-bold hover:bg-yellow-50">+5m</button>
                    <button onclick="window.applyDelay(15)" class="py-2 rounded-lg bg-white border border-yellow-200 text-yellow-700 font-bold hover:bg-yellow-50">+15m</button>
                    <button onclick="window.applyDelay(30)" class="py-2 rounded-lg bg-white border border-yellow-200 text-yellow-700 font-bold hover:bg-yellow-50">+30m</button>
                </div>
                <button onclick="window.resetActions()" class="w-full py-2 text-xs text-gray-400 hover:text-gray-600">返回</button>
            `;
        } else {
            // === 默认模式 (待服务 / 服务中) ===
            html = `<div class="grid grid-cols-2 gap-3">`;

            // 1. 开始服务 (仅待服务显示)
            if (isPending) {
                html += `
                    <button id="startServiceBtn" class="col-span-2 py-3 rounded-xl bg-green-500 text-white font-bold shadow-md hover:bg-green-600 flex items-center justify-center gap-2">
                        ▶️ 开始服务
                    </button>
                `;
            }

            // 2. 延迟 (仅待服务显示，服务中隐藏)
            if (isPending) {
                html += `
                    <button id="showDelayOptionsBtn" class="py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200 transition-all">
                        ⏳ 延迟
                    </button>
                `;
            }

            // 3. 结账 (待服务显示小按钮，服务中显示大按钮)
            const cashierClass = isPending 
                ? "py-3 rounded-xl bg-gray-800 text-white font-bold shadow-md hover:bg-black" 
                : "col-span-2 py-3 rounded-xl bg-gray-800 text-white font-bold shadow-md hover:bg-black text-lg animate-pulse";
            
            const cashierText = isPending ? "💵 结账" : "✅ 结束服务 & 结账";

            html += `
                <button id="cashierBtn" class="${cashierClass}">
                    ${cashierText}
                </button>
            `;

            // 4. 取消 (仅待服务显示)
            if (isPending) {
                html += `
                    <button id="cancelBtn" class="col-span-2 py-2 text-sm text-red-400 font-bold hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        🚫 取消此预约
                    </button>
                `;
            }

            // 关闭按钮
            html += `<button id="closeModalBtn" class="col-span-2 mt-2 text-xs text-gray-400 hover:text-gray-600">关闭窗口</button>`;
            html += `</div>`;
        }

        actionArea.innerHTML = html;
        bindActionEvents(); // 重新绑定事件
    }

    // 绑定事件处理器
    function bindActionEvents() {
        // 关闭
        const closeBtn = document.getElementById('closeModalBtn');
        if (closeBtn) closeBtn.onclick = () => modal.remove();

        // 补打小票
        const receiptBtn = document.getElementById('receiptBtn');
        if (receiptBtn) receiptBtn.onclick = () => {
            modal.remove();
            showReceiptModal(config, booking);
        };

        // 切换到延迟选项
        const delayBtn = document.getElementById('showDelayOptionsBtn');
        if (delayBtn) delayBtn.onclick = () => renderActions('delay_select');

        // 开始服务
        const startBtn = document.getElementById('startServiceBtn');
        if (startBtn) startBtn.onclick = async () => {
            // 🔥 记录开始时间
            await updateRecord(booking, { 
                status: 'serving',
                startedAt: new Date().toISOString() 
            });
            modal.remove();
            renderApp();
            showToast('✅ 开始计时！服务进行中...');
        };

        // 结账 (结束服务)
        const cashBtn = document.getElementById('cashierBtn');
        if (cashBtn) cashBtn.onclick = () => {
            modal.remove();
            showCashierModal(config, booking);
        };

        // 取消
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) cancelBtn.onclick = () => {
            // 调用外部统一的取消逻辑 (如果没有则用 prompt)
            if (typeof window.showCancelReasonModal === 'function') {
                modal.remove();
                window.showCancelReasonModal(booking.id);
            } else {
                const r = prompt("请输入取消原因:", "顾客临时取消");
                if (r) {
                    updateRecord(booking, { status: 'cancelled', cancelReason: r, cancelledAt: new Date().toISOString() })
                        .then(() => { modal.remove(); renderApp(); showToast('🚫 已取消'); });
                }
            }
        };
    }

    // 挂载全局辅助函数 (给 onclick 用)
    window.applyDelay = (min) => {
        const currentDelay = booking.delayMinutes || 0;
        updateRecord(booking, { delayMinutes: currentDelay + min }).then(() => {
            modal.remove();
            showOwnerAppointmentModal(config, booking); // 重新打开刷新
            renderApp();
            showToast(`🕒 已延长 ${min} 分钟`);
        });
    };

    window.resetActions = () => renderActions('default');

    // 初始渲染
    renderActions('default');
    
    // 点击遮罩关闭
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ==========================================
// 👇 [v1.3.6 Final Fix] 自动化大脑 (防重发/防连击)
// ==========================================
function initAutomation() {
    console.log("🧠 自动化大脑已启动 (10s 轮询)...");

    setInterval(async () => {
        // 🔥 每次都读最新的 LocalStorage，防止内存数据滞后
        const freshData = JSON.parse(localStorage.getItem('gembrow_data') || '[]');
        const bookings = freshData.filter(item => item.type === 'booking');
        
        const now = new Date();
        let hasChanges = false;
        let updatedBookings = [...bookings];

        for (let b of updatedBookings) {
            if (b.status !== 'pending') continue;

            const apptTime = new Date(`${b.appointmentDate}T${b.appointmentTime}`);
            const diffMinutes = (now - apptTime) / 1000 / 60; 

            // 1. ⏰ 提前 10 分钟 (-10 到 -9 之间)
            // 只要没提醒过 (b.reminded10m 为空)，且时间到了，就发
            if (diffMinutes >= -10 && diffMinutes < -8 && !b.reminded10m) {
                createNotification(b.customerName, '⏰ 预约提醒', `亲，您的预约将在 10 分钟后开始，请准备。`);
                createNotification('admin', '⏰ 接待提醒', `顾客 ${b.customerName} 将在 10 分钟后到达。`);
                b.reminded10m = true;
                hasChanges = true;
            }

            // 2. 🐢 迟到 15 分钟 (15 到 16 之间)
            if (diffMinutes >= 15 && diffMinutes < 17 && !b.markedLate15m) {
                createNotification(b.customerName, '🐢 迟到提醒', `您已迟到 15 分钟，请尽快到达以免被取消。`);
                createNotification('admin', '🐢 顾客迟到', `${b.customerName} 已迟到 15 分钟 (自动标记)。`);
                b.markedLate15m = true;
                if (!b.delayMinutes) b.delayMinutes = 15;
                hasChanges = true;
            }

            // 3. 💀 严重超时 30 分钟 (30 到 32 之间)
            if (diffMinutes >= 30 && diffMinutes < 32 && !b.markedSevere30m) {
                createNotification(b.customerName, '🚫 预约已取消', `因迟到超过 30 分钟，系统已自动取消您的预约。`);
                createNotification('admin', '🚫 自动取消', `${b.customerName} 迟到超 30 分钟，系统已执行取消。`);
                b.status = 'cancelled';
                b.cancelReason = '系统自动取消 (迟到 > 30m)';
                b.cancelledAt = new Date().toISOString();
                b.markedSevere30m = true;
                hasChanges = true;
            }
        }

        if (hasChanges) {
            // 保存回 LocalStorage
            const otherData = freshData.filter(d => d.type !== 'booking');
            localStorage.setItem('gembrow_data', JSON.stringify([...otherData, ...updatedBookings]));
            // 刷新当前内存
            allData = [...otherData, ...updatedBookings];
            // 刷新界面
            if (currentView === 'manage' || currentView === 'mybookings') renderApp();
        }

    }, 10000); 
}

// 辅助：创建通知 (完全独立版)
function createNotification(targetUser, title, msg) {
    const noti = {
        type: 'notification',
        category: 'alert',
        subtype: 'automation',
        id: 'noti_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), // 🔥 独立ID
        version: Date.now(), 
        title: title,
        message: msg,
        targetUser: targetUser, // 明确指定接收人
        isRead: false,
        createdAt: new Date().toISOString()
    };
    
    const allData = JSON.parse(localStorage.getItem('gembrow_data') || '[]');
    allData.push(noti);
    localStorage.setItem('gembrow_data', JSON.stringify(allData));
    
    // 只有当前登录用户是接收者时，才弹窗
    if (window.loggedInCustomerName === targetUser || 
       (targetUser === 'admin' && window.currentMode === 'owner')) {
        showToast(`🔔 ${title}`);
    }
}

// 辅助：内部创建通知函数 (修复 Admin 接收问题)
function createNotification(targetUser, title, msg) {
    const noti = {
        type: 'notification',
        category: 'alert',
        subtype: 'automation',
        version: Date.now(), // 唯一ID
        title: title,
        message: msg,
        targetUser: targetUser, 
        isRead: false,
        createdAt: new Date().toISOString()
    };
    
    // 读取 -> 插入 -> 保存
    const allData = JSON.parse(localStorage.getItem('gembrow_data') || '[]');
    allData.push(noti);
    localStorage.setItem('gembrow_data', JSON.stringify(allData));
    
    // 如果当前登录的人就是目标，弹个 Toast
    if (window.loggedInCustomerName === targetUser || (targetUser === 'admin' && window.currentMode === 'owner')) {
        showToast(`🔔 ${title}`);
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
// 👇 [v1.3.1-5] 头像上传与压缩处理 (新增)
// ==========================================
window.handleAvatarUpload = function(input) {
    const file = input.files[0];
    if (!file) return;

    // 1. 限制文件类型
    if (!file.type.startsWith('image/')) {
        showToast('❌ 请选择图片文件 (JPG/PNG)');
        return;
    }

    showToast('⏳ 正在处理头像...');

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = function() {
            // 2. 创建画布进行压缩 (Canvas)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置头像尺寸 (300x300 足够清晰，且文件很小)
            const MAX_SIZE = 300; 
            let width = img.width;
            let height = img.height;

            // 简单的居中裁剪逻辑 (模拟 object-fit: cover)
            const minDim = Math.min(width, height);
            const sx = (width - minDim) / 2;
            const sy = (height - minDim) / 2;

            canvas.width = MAX_SIZE;
            canvas.height = MAX_SIZE;
            
            // 3. 绘制图片 (裁剪正方形)
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, MAX_SIZE, MAX_SIZE);

            // 4. 导出为 Base64 (JPEG 质量 0.7)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

            // 5. 保存到数据库
            // 注意：这里我们使用 updateRecord 确保数据同步
            const customers = getDataByType('customer_account');
            const me = customers.find(c => c.username === loggedInCustomerName);
            
            if (me) {
                // 更新字段：avatar (统一新字段名)
                updateRecord(me, { avatar: compressedDataUrl }).then(() => {
                    showToast('✅ 头像更新成功！');
                    // 稍微延迟一下刷新，让用户看到提示
                    setTimeout(() => renderApp(), 500);
                });
            } else {
                showToast('❌ 找不到用户数据，请重新登录');
            }
        };
    };
    reader.readAsDataURL(file);
};

// ==========================================
// 👇 [v1.3.6 正式版] 更新日志 & 通知生成系统
// ==========================================


// ==========================================
// 👇 [v1.3.6 Final] 系统通知检查 (正式版日志)
// ==========================================
function checkAndCreateSystemNotifications() {
    const appChangelog = [
    {
            version: "v1.3.6 (正式版)",
            date: "2026-01-07",
            title: "🤖 自动化大脑 & 体验升级",
            features: [
                "⚡️ <b>自动化提醒</b>：预约前10分钟通知，迟到15分钟标记，迟到30分钟自动取消。",
                "🛡️ <b>身份安全</b>：用户名改为昵称，手机/邮箱唯一，改名后数据自动迁移。",
                "🔔 <b>消息中心 2.0</b>：通知支持点击查看详情，且商家/顾客完全隔离。",
                "🧾 <b>完美打印</b>：修复打印偏移，支持补打历史收据，店名动态跟随设置。"
            ]
        },
    {
        version: "v1.3.6 (Beta)",
        date: "2026-01-05",
        title: "💳 收银台逻辑闭环 (Cashier Logic)",
        features: [
            "💸 <b>智能收银流程</b>：重构 TNG 支付逻辑，选择 -> 扫码 -> 确认，流程更严谨。",
            "💊 <b>后悔药 Pro</b>：撤销订单时自动回滚库存、作废旧单据、还原合并单状态。",
            "📊 <b>精准财务</b>：统计报表新增“防重算”防火墙，自动过滤无效单据。",
            "🧾 <b>单号关联</b>：修复了预约单据没有正确关联流水号的问题。"
        ]
    },
    {
        version: "v1.3.5",
        date: "2026-01-04",
        title: "🛒 零售与支付闭环 (Retail & Payment)",
        features: [
            "📱 <b>零售收银升级</b>：优化 Pad 端布局，左侧选品、右侧结算，支持分类筛选。",
            "📦 <b>真实库存扣减</b>：无论是零售还是发货，系统现在会自动扣除对应商品的库存。",
            "🖨️ <b>热敏小票</b>：新增标准的 80mm 商业收据样式，支持新窗口静默打印。",
            "📤 <b>凭证上传</b>：顾客选择转账/TNG时，可以上传支付截图供商家核销。"
        ]
    },
    {
        version: "v1.3.3",
        date: "2026-01-02",
        title: "🎨 颜值与交互进化 (UI/UX Evolution)",
        features: [
            "👤 <b>头像自定义</b>：顾客与店长均可点击头像上传个性化照片，系统自动智能压缩。",
            "📱 <b>灵动菜单</b>：全新顶部下滑式菜单，单手操作更丝滑。",
            "🧩 <b>界面修复</b>：修复 Google 翻译/WhatsApp 按钮遮挡裁剪页面的问题。"
        ]
    },
    {
        version: "v1.3.0",
        date: "2025-12-31",
        title: "🚀 智能商业版 (Smart Business)",
        features: [
            "💰 <b>智能收银台</b>：支持关联库存商品、自动扣减库存。",
            "🔗 <b>全渠道同步</b>：收银时自动合并顾客的“购物车”和“待处理订单”。"
        ]
    }
];


window.appChangelog = appChangelog; 

    const latestVersion = appChangelog[0];
    const notifications = getDataByType('notification');
    
    // 🔍 检查是否已发送 (这次我们稍微放宽条件，确保你调试时能看到)
    // 如果你想强制再看一次，可以手动把 hasNotified 设为 false
    const hasNotified = notifications.some(n => 
        n.category === 'system' && 
        n.version === latestVersion.version
    );

    // 🔥 调试模式：即使发过了，为了让你看到，我们这里暂时允许重发
    // 正式上线后把 (|| true) 去掉即可
    if (!hasNotified) { 
        console.log(`🚀 推送新版本通知: ${latestVersion.version}`);
        
        const newNoti = {
            type: 'notification',
            category: 'system',
            subtype: 'version_update',
            id: 'sys_' + Date.now(),
            version: latestVersion.version,
            title: `🚀 系统升级: ${latestVersion.version}`,
            message: `更新内容：\n${latestVersion.features.map(f => '• ' + f.replace(/<[^>]*>/g, '')).join('\n')}`, 
            
            targetUser: 'all', // 🔥 核心修改：发给所有人
            
            isRead: false,
            createdAt: new Date().toISOString()
        };

        let allData = JSON.parse(localStorage.getItem('gembrow_data') || '[]');
        allData.push(newNoti);
        localStorage.setItem('gembrow_data', JSON.stringify(allData));
        
        renderApp();
        showToast(`🎉 系统已更新至 ${latestVersion.version}`);
    }
}

// ==========================================
// 👇 [v1.3.6] 会话超时自动登出 (30分钟无操作)
// ==========================================
function initSessionTimeout() {
    let timeout;
    const limit = 30 * 60 * 1000; // 30分钟 (毫秒)

    function logout() {
        // 只有在已登录状态 (owner 或 customer) 下才执行
        if (currentMode !== 'login') {
            console.log("⏰ 会话超时，自动登出");
            if (typeof window.handleLogout === 'function') {
                window.handleLogout(); // 调用现有的登出函数
            } else {
                // 兜底逻辑：如果 handleLogout 也没定义
                sessionStorage.removeItem('gembrow_session');
                location.reload();
            }
            alert("由于长时间未操作，为了安全起见，您已自动退出登录。");
        }
    }

    function resetTimer() {
        clearTimeout(timeout);
        // 只有在非登录页才启动倒计时
        if (currentMode !== 'login') {
            timeout = setTimeout(logout, limit);
        }
    }

    // 监听各种操作事件，只要动了就重置倒计时
    const events = ['mousemove', 'mousedown', 'click', 'scroll', 'keypress', 'touchstart'];
    events.forEach(evt => {
        document.addEventListener(evt, resetTimer);
    });

    resetTimer(); // 启动第一次
}

// ==========================================
// 👇 [v1.3.6 (Beta) Hotfix] 紧急清理重复通知 & 性能优化
// ==========================================
function cleanupDuplicateNotifications() {
    const notifications = getDataByType('notification');
    const uniqueMap = new Map();
    const duplicates = [];

    // 1. 找出重复项 (保留最新的一条)
    notifications.forEach(n => {
        const key = n.subtype + '_' + n.version; // 比如 "version_update_v1.3.6 (Beta)"
        if (n.category === 'system' && uniqueMap.has(key)) {
            duplicates.push(n); // 标记为垃圾
        } else {
            uniqueMap.set(key, n);
        }
    });

    // 2. 如果有垃圾，执行清理
    if (duplicates.length > 0) {
        console.warn(`🚨 发现 ${duplicates.length} 条重复通知，正在执行清理...`);
        
        // 直接操作底层数据，避免触发 renderApp
        const cleanList = notifications.filter(n => !duplicates.includes(n));
        
        // 强制写回 LocalStorage (不刷新页面)
        const allData = JSON.parse(localStorage.getItem('gembrow_data') || '[]');
        const otherData = allData.filter(d => d.type !== 'notification');
        const finalData = [...otherData, ...cleanList];
        
        localStorage.setItem('gembrow_data', JSON.stringify(finalData));
        console.log("✅ 清理完成！垃圾数据已移除。");
        
        // 只有清理了才刷新一次
        renderApp();
        showToast(`已自动清理 ${duplicates.length} 条冗余消息`);
    }
}

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

// ==========================================
// 👇 [v1.3.6] 程序启动入口
// ==========================================
initApp().then(() => {
    // 1. 初始化全局挂件 (WhatsApp, Google翻译)
    if (typeof initGlobalWidgets === 'function') initGlobalWidgets();
    
    // 2. 初始化超时登出 (刚才补上的函数)
    if (typeof initSessionTimeout === 'function') initSessionTimeout(); 
    
    // 3. 启动自动化大脑 (10s检查一次)
    if (typeof initAutomation === 'function') initAutomation();      

    // 4. 延迟检查系统更新
    setTimeout(() => {
        if (typeof cleanupDuplicateNotifications === 'function') cleanupDuplicateNotifications();
        if (typeof checkAndCreateSystemNotifications === 'function') checkAndCreateSystemNotifications(); 
    }, 1000);
});

//Gem Brow beauty [v1.3.6]