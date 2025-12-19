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
const STORAGE_KEY = 'gem_brow_data'; // 统一使用一个 Key
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
    return settings || {
        bronze_discount: 0,
        silver_discount: 5,
        gold_discount: 10,
        platinum_discount: 15,
        bronze_points: 0,
        silver_points: 100,
        gold_points: 300,
        platinum_points: 600,
        points_to_rm_rate: 10
    };
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
    const app = document.getElementById('app');
    const config = window.elementSdk?.config || defaultConfig;

    app.style.backgroundColor = config.background_color;
    app.style.color = config.text_color;
    app.style.fontFamily = `${config.font_family}, serif`;

    if (currentMode === 'login') {
        renderLoginPage(app, config);
        return;
    }

    const services = getDataByType('service');
    const bookings = getDataByType('booking');
    const posts = getDataByType('post');
    const customers = getDataByType('customer_account');

    renderMainApp(app, config, services, bookings, posts, customers);
}

function renderLoginPage(app, config) {
    app.innerHTML = `
        <div class="min-h-full flex items-center justify-center p-6 login-page-bg">
            <div class="max-w-md w-full">
                
                <img src="./assets/login_bg.png" alt="Logo" class="login-main-logo">

                  <p class="text-center mb-8" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.7; font-weight: 600;">
                        JB专业美睫纹绣师Gennie
                 </p>
                
                <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); padding: 32px; border: 3px solid ${config.primary_action_color};">
                    ${showRegisterForm ? `
                        <h2 class="mb-6" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.primary_action_color};">注册新账户</h2>
                        <form id="registerForm">
                            <div class="mb-4">
                                <label for="regUsername" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                    用户名
                                </label>
                                <input type="text" id="regUsername" required
                                    class="w-full px-4 py-3 rounded-lg border-2"
                                    style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                            </div>
                            <div class="mb-4">
                                <label for="regEmail" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                    邮箱
                                </label>
                                <input type="email" id="regEmail" required
                                    class="w-full px-4 py-3 rounded-lg border-2"
                                    style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                            </div>
                            <div class="mb-6">
                                <label for="regPassword" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                    密码
                                </label>
                                <input type="password" id="regPassword" required
                                    class="w-full px-4 py-3 rounded-lg border-2"
                                    style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                            </div>
                            
                            <button type="submit" class="w-full btn-primary py-3 rounded-lg font-semibold mb-4"
                                style="font-family: Lato, sans-serif; background-color: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                注册
                            </button>
                            
                            <button type="button" id="showLoginBtn" class="w-full py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background-color: transparent; color: ${config.primary_action_color}; font-size: ${config.font_size}px; border: 2px solid ${config.primary_action_color};">
                                返回登录
                            </button>
                        </form>
                    ` : `
                        <h2 class="mb-6" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.primary_action_color};">登录</h2>
                        <form id="loginForm">
                            <div class="mb-4">
                                <label for="loginUsername" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                    用户名
                                </label>
                                <input type="text" id="loginUsername" required
                                    class="w-full px-4 py-3 rounded-lg border-2"
                                    style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                            </div>
                            <div class="mb-4">
                                <label for="loginPassword" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                    密码
                                </label>
                                <input type="password" id="loginPassword" required
                                    class="w-full px-4 py-3 rounded-lg border-2"
                                    style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                            </div>
                            
                            <div class="flex gap-4 mb-6" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px;">
                                <button type="button" id="showRegisterBtn" style="color: ${config.primary_action_color}; font-weight: 600; background: none; border: none; cursor: pointer; padding: 0;">
                                    注册账户
                                </button>
                                <span style="color: ${config.text_color}; opacity: 0.3;">|</span>
                                <button type="button" id="guestBtn" style="color: ${config.primary_action_color}; font-weight: 600; background: none; border: none; cursor: pointer; padding: 0;">
                                    游客进入
                                </button>
                            </div>
                            
                            <button type="submit" class="w-full btn-primary py-3 rounded-lg font-semibold"
                                style="font-family: Lato, sans-serif; background-color: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                登录
                            </button>
                        </form>
                    `}
                </div>
            </div>
        </div>
    `;

    if (showRegisterForm) {
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleRegister(
                document.getElementById('regUsername').value,
                document.getElementById('regPassword').value,
                document.getElementById('regEmail').value
            );
        });

        document.getElementById('showLoginBtn').addEventListener('click', () => {
            showRegisterForm = false;
            renderApp();
        });
    } else {
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin(
                document.getElementById('loginUsername').value,
                document.getElementById('loginPassword').value
            );
        });

        document.getElementById('showRegisterBtn').addEventListener('click', () => {
            showRegisterForm = true;
            renderApp();
        });

        document.getElementById('guestBtn').addEventListener('click', () => {
            currentMode = 'customer';
            currentView = 'services';
            renderApp();
        });
    }
}

function renderMainApp(app, config, services, bookings, posts, customers) {
    const currentYear = new Date().getFullYear();
    app.innerHTML = `
        <div class="min-h-full">
            <header style="background: rgba(255, 255, 255, 0.95); box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 40; border-bottom: 3px solid ${config.primary_action_color};">
                <div class="max-w-7xl mx-auto px-6 py-2 flex justify-between items-center">
                    
                    <img src="./assets/header_logo.png" alt="${config.app_title}" class="header-logo-img">
                    
                    <button id="menuBtn" class="px-4 py-2 rounded-lg" style="border: 2px solid ${config.primary_action_color}; background: ${config.primary_action_color}22; color: ${config.primary_action_color}; font-family: Lato, sans-serif;">
                        ☰ 菜单
                    </button>
                </div>
            </header>
                    
                    <!-- Menu Overlay -->
                    ${showMenu ? `
                        <div id="menuOverlay" class="modal-backdrop fixed inset-0 z-50 flex items-end justify-end p-4">
                            <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 24px; width: 280px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); border: 2px solid ${config.primary_action_color};">
                                <h3 class="mb-4" style="font-size: ${config.font_size * 1.3}px; font-weight: 700; color: ${config.primary_action_color};">菜单</h3>
                                ${currentMode === 'owner' ? `
                                    <!-- 业主菜单功能按钮 -->
                                    <button id="viewManage" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'manage' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                        🛠️ 管理中心 <!-- 管理服务、商品、动态 -->
                                    </button>
                                    <button id="viewStats" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'stats' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                        📊 数据统计 <!-- 查看预约和销售统计 -->
                                    </button>
                                    <button id="viewCustomers" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'customers' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                        👥 客户管理 <!-- 管理注册客户信息 -->
                                    </button>
                                    <button id="viewSettings" class="w-full text-left px-4 py-3 rounded-lg mb-4" style="font-family: Lato, sans-serif; background: ${currentView === 'settings' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                        ⚙️ 系统设置 <!-- 配置折扣和积分规则 -->
                                    </button>
                                ` : `
                                    <!-- 客户菜单功能按钮 -->
                                    <button id="viewServices" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'services' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                        💅 服务预约 <!-- 浏览和预约服务 -->
                                    </button>
                                    ${loggedInCustomerName ? `
                                        <button id="viewMyBookings" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'mybookings' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                            📅 我的预约 <!-- 查看个人预约记录 -->
                                        </button>
                                        <button id="viewProfile" class="w-full text-left px-4 py-3 rounded-lg mb-4" style="font-family: Lato, sans-serif; background: ${currentView === 'profile' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                            👤 我的账户 <!-- 查看和编辑账户信息 -->
                                        </button>
                                    ` : ''}
                                `}
                                <button class="logout-btn w-full px-4 py-3 rounded-lg" style="font-family: Lato, sans-serif; background: ${config.secondary_action_color}; color: #ffffff;">
                                    ${loggedInCustomerName || currentMode === 'owner' ? '退出登录' : '返回首页'}
                                </button>
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Main Content -->
                    <main class="max-w-7xl mx-auto px-6 py-8">
                        ${currentMode === 'owner' ? renderOwnerView(config, services, bookings, posts, customers) : renderCustomerView(config, services, bookings, posts)}
                    </main>

                    <footer class="mt-auto py-8 text-center border-t border-gray-200" style="background: #fafafa; color: ${config.text_color};">
                       <div class="max-w-7xl mx-auto px-6">
                           <div class="flex flex-wrap justify-center gap-6 mb-4 text-sm font-medium opacity-70">
                               <button class="footer-link hover:underline" data-type="terms">Terms & Conditions</button>
                               <button class="footer-link hover:underline" data-type="privacy">Privacy Policy</button>
                               <button class="footer-link hover:underline" data-type="cookies">Cookies Notice</button>
                           </div>
                           <p class="text-xs opacity-50">
                               Copyright © ${currentYear} ${config.app_title}. All rights reserved.<br>
                               Designed for Beauty & Wellness.
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

function renderSettings(config) {
    const discountSettings = getDiscountSettings();
    
    return `
        <div>
            <h2 class="mb-8" style="font-size: ${config.font_size * 2}px; font-weight: 700; color: ${config.primary_action_color};">
                系统设置
            </h2>
            
            <div class="mb-8" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 32px; max-width: 600px;">
                <h3 class="mb-6" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.text_color};">
                    👤 修改业主登录信息
                </h3>
                <form id="changeCredentialsForm">
                    <div class="mb-4">
                        <label class="block mb-2" style="font-size: ${config.font_size * 0.9}px;">新用户名 (当前: ${ownerCredentials.username})</label>
                        <input type="text" id="newUsername" value="${ownerCredentials.username}" required class="w-full px-4 py-3 rounded-lg border-2">
                    </div>
                    <div class="mb-4">
                        <label class="block mb-2" style="font-size: ${config.font_size * 0.9}px;">新密码 (不改请留空)</label>
                        <input type="password" id="newPassword" placeholder="输入新密码" class="w-full px-4 py-3 rounded-lg border-2">
                    </div>
                    <button type="submit" class="btn-primary px-8 py-3 rounded-lg" style="background: ${config.primary_action_color}; color: #ffffff;">保存修改</button>
                </form>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 32px; max-width: 600px;">
                <h3 class="mb-6" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.text_color};">
                    ⚙️ 规则与开关
                </h3>
                
                <form id="discountSettingsForm">
                    <div class="grid grid-cols-1 gap-4 mb-8">
                        <div class="flex items-center justify-between p-4 rounded-lg border-2" style="border-color: ${config.primary_action_color}; background: ${config.primary_action_color}11;">
                            <div>
                                <h4 style="font-weight: 700;">启用积分与会员</h4>
                                <p style="font-size: 12px; opacity: 0.7;">累计消费升级，积分抵扣</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="enableRewards" class="sr-only peer" ${discountSettings.enable_rewards !== false ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[${config.primary_action_color}] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            </label>
                        </div>

                        <div class="flex items-center justify-between p-4 rounded-lg border-2" style="border-color: ${config.secondary_action_color}; background: ${config.secondary_action_color}11;">
                            <div>
                                <h4 style="font-weight: 700;">启用在线商城</h4>
                                <p style="font-size: 12px; opacity: 0.7;">展示商品并允许下单</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="enableShop" class="sr-only peer" ${discountSettings.enable_shop !== false ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-[${config.secondary_action_color}] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            </label>
                        </div>
                    </div>

                    <h4 class="mb-4 font-bold border-b pb-2">🏆 会员等级与折扣</h4>
                    <div class="space-y-4 mb-8">
                        <div class="grid grid-cols-3 gap-2 text-sm opacity-60 mb-1">
                            <span>等级名称</span>
                            <span>所需积分</span>
                            <span>折扣 (%)</span>
                        </div>
                        
                        <div class="grid grid-cols-3 gap-2 items-center">
                            <span style="color: #cd7f32; font-weight: bold;">🥉 铜牌</span>
                            <input type="number" id="bronzePoints" value="${discountSettings.bronze_points || 0}" class="px-2 py-1 border rounded">
                            <input type="number" id="bronzeDiscount" value="${discountSettings.bronze_discount || 0}" class="px-2 py-1 border rounded">
                        </div>
                        <div class="grid grid-cols-3 gap-2 items-center">
                            <span style="color: #c0c0c0; font-weight: bold;">🥈 银牌</span>
                            <input type="number" id="silverPoints" value="${discountSettings.silver_points || 100}" class="px-2 py-1 border rounded">
                            <input type="number" id="silverDiscount" value="${discountSettings.silver_discount || 5}" class="px-2 py-1 border rounded">
                        </div>
                        <div class="grid grid-cols-3 gap-2 items-center">
                            <span style="color: #ffd700; font-weight: bold;">🥇 金牌</span>
                            <input type="number" id="goldPoints" value="${discountSettings.gold_points || 300}" class="px-2 py-1 border rounded">
                            <input type="number" id="goldDiscount" value="${discountSettings.gold_discount || 10}" class="px-2 py-1 border rounded">
                        </div>
                        <div class="grid grid-cols-3 gap-2 items-center">
                            <span style="color: #e5e4e2; font-weight: bold;">💎 铂金</span>
                            <input type="number" id="platinumPoints" value="${discountSettings.platinum_points || 600}" class="px-2 py-1 border rounded">
                            <input type="number" id="platinumDiscount" value="${discountSettings.platinum_discount || 15}" class="px-2 py-1 border rounded">
                        </div>
                    </div>

                    <h4 class="mb-4 font-bold border-b pb-2">💰 积分抵扣汇率</h4>
                    <div class="flex items-center gap-4 mb-8">
                        <span class="text-sm">每使用</span>
                        <input type="number" id="pointsToRmRate" value="${discountSettings.points_to_rm_rate || 10}" class="w-20 px-2 py-1 border rounded text-center font-bold">
                        <span class="text-sm">积分 = 抵扣 RM 1.00</span>
                    </div>
                    
                    <button type="submit" class="btn-primary px-8 py-3 rounded-lg w-full"
                        style="background: ${config.primary_action_color}; color: #ffffff;">
                        保存所有设置
                    </button>
                </form>
            </div>s
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

function renderProfile(config, bookings) {
    const customerAccount = getDataByType('customer_account').find(acc => acc.username === loggedInCustomerName);
    if (!customerAccount) return '';

    const myBookings = bookings.filter(b => b.customerName === loggedInCustomerName);
    const completedBookings = myBookings.filter(b => b.status === 'completed');
    const settings = getDiscountSettings();

    // 【关键】检查开关是否开启 (默认为 true)
    const showRewards = settings.enable_rewards !== false;

    return `
               <div>
                  <h2 class="mb-8" style="font-size: ${config.font_size * 2}px; font-weight: 700; color: ${config.primary_action_color};">
                      我的账户
                  </h2>
            
                  <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 32px; max-width: 600px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                       <div class="mb-6">
                          <div class="flex justify-between items-center mb-4">
                              <h3 style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.text_color};">
                                  ${customerAccount.username}
                             </h3>
                             ${showRewards ? getMembershipBadge(customerAccount.membershipLevel, config) : ''}
                          </div>
                    
                          <p style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                          📧 ${customerAccount.email}
                          </p>
                    
                          ${showRewards ? `
                          <p style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                              ⭐ 积分: ${customerAccount.points}
                          </p>
                          <p style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                              🎁 当前折扣: <span style="color: ${config.primary_action_color}; font-weight: 700;">${getMembershipDiscountText(customerAccount.membershipLevel)}</span>
                         </p>
                         ` : ''}
                    
                         <p style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                             📅 总预约: ${myBookings.length}次
                         </p>
                         <p style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 16px;">
                             ✅ 已完成: ${completedBookings.length}次
                         </p>
                    
                         <button id="editProfileBtn" class="w-full btn-primary py-3 rounded-lg"
                             style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                             ✏️ 编辑个人资料
                         </button>
                     </div>
                
                     ${showRewards ? `
                     <div style="border-top: 2px solid ${config.primary_action_color}22; padding-top: 24px; margin-top: 24px;">
                         <h4 style="font-size: ${config.font_size * 1.2}px; font-weight: 700; color: ${config.text_color}; margin-bottom: 12px;">
                             会员等级说明
                         </h4>
                         <div class="space-y-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.8;">
                             <p>🥉 铜牌会员: ${settings.bronze_points}+积分 (${settings.bronze_discount}%折扣)</p>
                             <p>🥈 银牌会员: ${settings.silver_points}+积分 (${settings.silver_discount}%折扣)</p>
                             <p>🥇 金牌会员: ${settings.gold_points}+积分 (${settings.gold_discount}%折扣)</p>
                             <p>💎 白金会员: ${settings.platinum_points}+积分 (${settings.platinum_discount}%折扣)</p>
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
        // 简单的保存逻辑，保持原有设置不丢失
        const currentSettings = getDataByType('discount_settings')[0] || {};
        const newSettings = {
            type: 'discount_settings',
            enable_rewards: document.getElementById('enableRewards').checked,
            enable_shop: document.getElementById('enableShop').checked,
            // 保持原有的数值设置
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
        renderApp();
        showToast('设置已保存');
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
    document.querySelectorAll('.footer-link').forEach(btn => {
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

    function handleFile(file) {
        if (!file) return;
        if (file.size > 614400) {
            alert('❌ 图片太大！请使用 500KB 以下的小图。');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            serviceImageInput.value = e.target.result;
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            uploadText.style.display = 'none';
        };
        reader.readAsDataURL(file);
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

function showEditCustomerModal(config, customer) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
                <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <h3 class="mb-6" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                        编辑客户资料
                    </h3>
                    
                    <form id="editCustomerForm">
                        <div class="mb-4">
                            <label for="editEmail" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                邮箱
                            </label>
                            <input type="email" id="editEmail" required value="${customer.email}"
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-4">
                            <label for="editPoints" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                积分
                            </label>
                            <input type="number" id="editPoints" required min="0" value="${customer.points}"
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-6">
                            <label for="editMembership" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                会员等级
                            </label>
                            <select id="editMembership" required
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                                <option value="bronze" ${customer.membershipLevel === 'bronze' ? 'selected' : ''}>铜牌会员</option>
                                <option value="silver" ${customer.membershipLevel === 'silver' ? 'selected' : ''}>银牌会员</option>
                                <option value="gold" ${customer.membershipLevel === 'gold' ? 'selected' : ''}>金牌会员</option>
                                <option value="platinum" ${customer.membershipLevel === 'platinum' ? 'selected' : ''}>白金会员</option>
                            </select>
                        </div>
                        
                        <div class="flex gap-3">
                            <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                保存修改
                            </button>
                            <button type="button" id="cancelEditCustomerBtn" class="flex-1 py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">
                                取消
                            </button>
                        </div>
                    </form>
                </div>
            `;

    document.body.appendChild(modal);

    document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        await updateRecord(customer, {
            email: document.getElementById('editEmail').value,
            points: parseInt(document.getElementById('editPoints').value),
            membershipLevel: document.getElementById('editMembership').value
        });

        modal.remove();
    });

    document.getElementById('cancelEditCustomerBtn').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function showEditProfileModal(config, customer) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
                <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <h3 class="mb-6" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                        编辑个人资料
                    </h3>
                    
                    <form id="editProfileForm">
                        <div class="mb-4">
                            <label for="editProfileUsername" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                用户名
                            </label>
                            <input type="text" id="editProfileUsername" required value="${customer.username}"
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        <div class="mb-4">
                            <label for="editProfileEmail" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                邮箱
                            </label>
                            <input type="email" id="editProfileEmail" required value="${customer.email}"
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-6">
                            <label for="editProfilePassword" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                新密码 (留空保持不变)
                            </label>
                            <input type="password" id="editProfilePassword" placeholder="留空保持当前密码"
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="flex gap-3">
                            <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                保存修改
                            </button>
                            <button type="button" id="cancelEditProfileBtn" class="flex-1 py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">
                                取消
                            </button>
                        </div>
                    </form>
                </div>
            `;

    document.body.appendChild(modal);

    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const newUsername = document.getElementById('editProfileUsername').value.trim();
        const newEmail = document.getElementById('editProfileEmail').value.trim();
        const newPassword = document.getElementById('editProfilePassword').value;

        if (!newUsername || !newEmail) {
            showToast('用户名和邮箱不能为空');
            return;
        }

        // 检查用户名是否已存在 (如果改变)
        if (newUsername !== customer.username) {
            const existing = getDataByType('customer_account').find(acc => acc.username === newUsername);
            if (existing) {
                showToast('用户名已存在');
                return;
            }
        }

        const updates = {
            username: newUsername,
            email: newEmail
        };

        if (newPassword && newPassword.length >= 4) {
            updates.password = newPassword;
        } else if (newPassword && newPassword.length < 4) {
            showToast('密码至少需要4个字符');
            return;
        }

        await updateRecord(customer, updates);

        // 如果用户名改变，更新登录状态
        if (newUsername !== customer.username) {
            loggedInCustomerName = newUsername;
        }

        modal.remove();
        renderApp();
        showToast('个人资料已更新');
    });

    document.getElementById('cancelEditProfileBtn').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
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
                <h4 class="font-bold mb-2">1. 预约规则</h4>
                <p class="mb-4">所有服务需提前预约。若需取消或改期，请至少提前 24 小时通知我们。迟到超过 15 分钟可能导致预约被取消。</p>
                <h4 class="font-bold mb-2">2. 支付与定金</h4>
                <p class="mb-4">我们接受现金、银行转账及电子钱包支付。部分服务可能需要预付定金，定金不可退还。</p>
                <h4 class="font-bold mb-2">3. 服务质量保障</h4>
                <p class="mb-4">若您对服务有任何不满，请在服务完成后 3 天内联系我们，我们将尽力为您解决。</p>
            `
        },
        privacy: {
            title: "Privacy Policy (隐私政策)",
            content: `
                <h4 class="font-bold mb-2">1. 数据收集</h4>
                <p class="mb-4">我们收集您的姓名、电话和邮箱仅用于预约确认和会员积分记录，绝不会出售给第三方。</p>
                <h4 class="font-bold mb-2">2. 数据安全</h4>
                <p class="mb-4">我们会采取合理的安全措施保护您的个人信息安全。</p>
            `
        },
        cookies: {
            title: "Cookies Notice (Cookies 声明)",
            content: `
                <p class="mb-4">本网站使用本地存储 (Local Storage) 来保存您的登录状态和购物车信息，以提供更流畅的用户体验。继续使用本网站即表示您同意我们使用这些技术。</p>
            `
        }
    };

    const policy = policies[type];
    if (!policy) return;

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 600px; width: 100%; border: 2px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-height: 80vh; overflow-y: auto;">
            <div class="flex justify-between items-center mb-6 border-b pb-4">
                <h3 style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.primary_action_color};">
                    ${policy.title}
                </h3>
                <button id="closePolicyBtn" style="font-size: 24px; color: ${config.text_color}; background: none; border: none; cursor: pointer;">✕</button>
            </div>
            
            <div class="text-sm leading-relaxed opacity-80" style="color: ${config.text_color}; font-family: sans-serif;">
                ${policy.content}
            </div>
            
            <div class="mt-8 text-center">
                <button id="okPolicyBtn" class="px-8 py-2 rounded-lg"
                    style="background: ${config.primary_action_color}; color: #ffffff; font-weight: bold;">
                    了解了
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
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
             if (file.size > 307200) { alert('图片太大'); return; }
             const reader = new FileReader();
             reader.onload = (evt) => { imageInput.value = evt.target.result; updatePreview(evt.target.result); };
             reader.readAsDataURL(file);
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
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
             if (file.size > 307200) { alert('图片太大'); return; }
             const reader = new FileReader();
             reader.onload = (evt) => { imageInput.value = evt.target.result; updatePreview(evt.target.result); };
             reader.readAsDataURL(file);
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

initApp();