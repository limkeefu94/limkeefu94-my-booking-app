// === 模拟 SDK (放在 script.js 最前面) ===

// 1. 模拟配置 SDK
window.elementSdk = {
    config: {
        // 这里填你原来的默认配置
        primary_action_color: '#d946ef',
        background_color: '#fdf2f8',
        // ... 其他配置
    },
    init: async () => console.log('Simulated Element SDK Ready')
};

// 2. 模拟数据 SDK (使用 LocalStorage)
const STORAGE_KEY = 'gem_brow_data';
function loadData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // 通知 App 数据变了
    if(window.dataHandler) window.dataHandler.onDataChanged(data);
}

window.dataSdk = {
    init: async (handler) => {
        window.dataHandler = handler; // 记住那个处理函数
        setTimeout(() => handler.onDataChanged(loadData()), 100); // 假装从服务器加载
        return { isOk: true };
    },
    create: async (record) => {
        const data = loadData();
        data.push(record);
        saveData(data);
        return { isOk: true };
    },
    update: async (record) => {
        let data = loadData();
        const index = data.findIndex(item => item.id === record.id);
        if(index !== -1) {
            data[index] = { ...data[index], ...record }; // 合并更新
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
        app_title: 'Gem Brow 美睫美眉',
        posts_title: '店铺动态'
    },
    init: async (options) => { console.log('SDK Ready'); if(options.onConfigChange) options.onConfigChange(window.elementSdk.config); }
};

const DB_KEY = 'gembrow_data';
const loadDb = () => JSON.parse(localStorage.getItem(DB_KEY) || '[]');
const saveDb = (d) => { localStorage.setItem(DB_KEY, JSON.stringify(d)); if(window.dataHandler) window.dataHandler.onDataChanged(d); };

window.dataSdk = {
    init: async (h) => { window.dataHandler = h; setTimeout(() => h.onDataChanged(loadDb()), 100); return { isOk: true }; },
    create: async (r) => { const d = loadDb(); d.push({...r, id: Date.now().toString()}); saveDb(d); return { isOk: true }; },
    update: async (r) => { const d = loadDb(); const i = d.findIndex(x => x.id === r.id); if(i!==-1) { d[i] = {...d[i], ...r}; saveDb(d); return { isOk: true }; } return { isOk: false }; },
    delete: async (r) => { const d = loadDb(); saveDb(d.filter(x => x.id !== r.id)); return { isOk: true }; }
};

// ------------- 第二部分：原本的业务逻辑 (这里必须粘贴你完整的原始代码) -------------
        // 全局状态
        let allData = [];
        let currentMode = 'login';
        let currentView = 'services';
        let isLoading = false;
        let showMenu = false;
        let loggedInCustomerName = '';
        let showRegisterForm = false;
        let searchQuery = '';
        let filterStatus = 'all';
        
        const defaultConfig = {
            background_color: '#fdf2f8',
            surface_color: '#ffffff',
            text_color: '#4a1e3a',
            primary_action_color: '#d946ef',
            secondary_action_color: '#f472b6',
            font_family: 'Playfair Display',
            font_size: 16,
            app_title: 'Gem Brow 美睫美眉',
            posts_title: '店铺动态'
        };
        
        let ownerCredentials = { username: 'admin', password: '1231' };
        
        // Data SDK Handler
        const dataHandler = {
            onDataChanged(data) {
                allData = data;
                const credData = data.find(item => item.type === 'owner_credentials');
                if (credData) {
                    ownerCredentials = { username: credData.username, password: credData.password };
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
            const dateFilter = window.statsDateFilter || 'all';
            const customStartDate = window.statsStartDate || '';
            const customEndDate = window.statsEndDate || '';
            
            // Filter bookings by date
            let filteredBookings = bookings;
            const now = new Date();
            
            if (dateFilter === 'today') {
                const today = now.toISOString().split('T')[0];
                filteredBookings = bookings.filter(b => b.appointmentDate === today);
            } else if (dateFilter === 'this_week') {
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                const startDate = startOfWeek.toISOString().split('T')[0];
                filteredBookings = bookings.filter(b => b.appointmentDate >= startDate);
            } else if (dateFilter === 'this_month') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startDate = startOfMonth.toISOString().split('T')[0];
                filteredBookings = bookings.filter(b => b.appointmentDate >= startDate);
            } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
                filteredBookings = bookings.filter(b => 
                    b.appointmentDate >= customStartDate && b.appointmentDate <= customEndDate
                );
            }
            
            const totalBookings = filteredBookings.length;
            const completedBookings = filteredBookings.filter(b => b.status === 'completed').length;
            const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
            const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length;
            const totalRevenue = filteredBookings.filter(b => b.status === 'completed')
                .reduce((sum, b) => sum + b.totalAmount, 0);
            
            // Title
            doc.setFontSize(20);
            doc.text('Gem Brow Business Statistics', 105, 20, { align: 'center' });
            
            // Date range
            doc.setFontSize(12);
            let dateRangeText = 'Period: ';
            if (dateFilter === 'all') {
                dateRangeText += 'All Time';
            } else if (dateFilter === 'today') {
                dateRangeText += 'Today';
            } else if (dateFilter === 'this_week') {
                dateRangeText += 'This Week';
            } else if (dateFilter === 'this_month') {
                dateRangeText += 'This Month';
            } else if (dateFilter === 'custom') {
                dateRangeText += `${customStartDate} to ${customEndDate}`;
            }
            doc.text(dateRangeText, 105, 30, { align: 'center' });
            
            // Generated date
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString('zh-CN')}`, 105, 37, { align: 'center' });
            
            // Overview Stats
            doc.setFontSize(14);
            doc.text('Overview Statistics', 20, 50);
            
            doc.setFontSize(11);
            let yPos = 60;
            doc.text(`Total Bookings: ${totalBookings}`, 20, yPos);
            yPos += 8;
            doc.text(`Completed: ${completedBookings}`, 20, yPos);
            yPos += 8;
            doc.text(`Pending: ${pendingBookings}`, 20, yPos);
            yPos += 8;
            doc.text(`Cancelled: ${cancelledBookings}`, 20, yPos);
            yPos += 8;
            doc.text(`Total Revenue: RM${totalRevenue.toFixed(2)}`, 20, yPos);
            yPos += 8;
            doc.text(`Registered Customers: ${customers.length}`, 20, yPos);
            
            // Service Statistics
            yPos += 15;
            doc.setFontSize(14);
            doc.text('Service Performance', 20, yPos);
            
            const serviceStats = services.map(service => {
                const serviceBookings = filteredBookings.filter(b => b.serviceId === service.id && b.status === 'completed');
                return {
                    name: service.name,
                    count: serviceBookings.length,
                    revenue: serviceBookings.reduce((sum, b) => sum + b.totalAmount, 0)
                };
            }).sort((a, b) => b.count - a.count);
            
            yPos += 10;
            doc.setFontSize(11);
            serviceStats.forEach((stat, index) => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(`${index + 1}. ${stat.name}: ${stat.count} bookings, RM${stat.revenue.toFixed(2)}`, 25, yPos);
                yPos += 7;
            });
            
            // Membership Distribution
            yPos += 10;
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(14);
            doc.text('Membership Distribution', 20, yPos);
            
            yPos += 10;
            doc.setFontSize(11);
            const membershipStats = {
                bronze: customers.filter(c => c.membershipLevel === 'bronze').length,
                silver: customers.filter(c => c.membershipLevel === 'silver').length,
                gold: customers.filter(c => c.membershipLevel === 'gold').length,
                platinum: customers.filter(c => c.membershipLevel === 'platinum').length
            };
            
            doc.text(`Bronze Members: ${membershipStats.bronze}`, 25, yPos);
            yPos += 7;
            doc.text(`Silver Members: ${membershipStats.silver}`, 25, yPos);
            yPos += 7;
            doc.text(`Gold Members: ${membershipStats.gold}`, 25, yPos);
            yPos += 7;
            doc.text(`Platinum Members: ${membershipStats.platinum}`, 25, yPos);
            
            // Save PDF
            const fileName = `statistics_${dateFilter === 'custom' ? `${customStartDate}_to_${customEndDate}` : dateFilter}_${Date.now()}.pdf`;
            doc.save(fileName);
            
            showToast('PDF导出成功！');
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
        function calculateMembershipLevel(points) {
            const settings = getDiscountSettings();
            if (points >= settings.platinum_points) return 'platinum';
            if (points >= settings.gold_points) return 'gold';
            if (points >= settings.silver_points) return 'silver';
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
            if (username === ownerCredentials.username && password === ownerCredentials.password) {
                currentMode = 'owner';
                currentView = 'manage';
                loggedInCustomerName = '';
                showToast('登入成功！');
                renderApp();
                return true;
            }
            
            const customerAccount = getDataByType('customer_account').find(
                acc => acc.username === username && acc.password === password
            );
            
            if (customerAccount) {
                currentMode = 'customer';
                currentView = 'services';
                loggedInCustomerName = username;
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
                <div class="min-h-full flex items-center justify-center p-6" style="background: linear-gradient(135deg, ${config.background_color} 0%, #ffffff 100%);">
                    <div class="max-w-md w-full">
                        <div class="text-center mb-8">
                            <h1 class="mb-2" style="font-size: ${config.font_size * 2.5}px; font-weight: 700; background: linear-gradient(135deg, ${config.primary_action_color} 0%, ${config.secondary_action_color} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                                ${config.app_title}
                            </h1>
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.7;">
                                专业美睫美眉服务
                            </p>
                        </div>
                        
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
            app.innerHTML = `
                <div class="min-h-full">
                    <!-- Header -->
                    <header style="background: rgba(255, 255, 255, 0.95); box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 40; border-bottom: 3px solid ${config.primary_action_color};">
                        <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                            <h1 style="font-size: ${config.font_size * 1.8}px; font-weight: 700; background: linear-gradient(135deg, ${config.primary_action_color} 0%, ${config.secondary_action_color} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                                ${config.app_title}
                            </h1>
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
                                    <button id="viewManage" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'manage' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                        🛠️ 管理中心
                                    </button>
                                    <button id="viewStats" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'stats' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                        📊 数据统计
                                    </button>
                                    <button id="viewCustomers" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'customers' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                        👥 客户管理
                                    </button>
                                    <button id="viewSettings" class="w-full text-left px-4 py-3 rounded-lg mb-4" style="font-family: Lato, sans-serif; background: ${currentView === 'settings' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                        ⚙️ 系统设置
                                    </button>
                                ` : `
                                    <button id="viewServices" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'services' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                        💅 服务预约
                                    </button>
                                    ${loggedInCustomerName ? `
                                        <button id="viewMyBookings" class="w-full text-left px-4 py-3 rounded-lg mb-2" style="font-family: Lato, sans-serif; background: ${currentView === 'mybookings' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                            📅 我的预约
                                        </button>
                                        <button id="viewProfile" class="w-full text-left px-4 py-3 rounded-lg mb-4" style="font-family: Lato, sans-serif; background: ${currentView === 'profile' ? config.primary_action_color + '22' : 'transparent'}; color: ${config.text_color};">
                                            👤 我的账户
                                        </button>
                                    ` : ''}
                                `}
                                <button id="logoutBtn" class="w-full px-4 py-3 rounded-lg" style="font-family: Lato, sans-serif; background: ${config.secondary_action_color}; color: #ffffff;">
                                    ${loggedInCustomerName || currentMode === 'owner' ? '退出登录' : '返回首页'}
                                </button>
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Main Content -->
                    <main class="max-w-7xl mx-auto px-6 py-8">
                        ${currentMode === 'owner' ? renderOwnerView(config, services, bookings, posts, customers) : renderCustomerView(config, services, bookings, posts)}
                    </main>
                </div>
            `;
            
            attachEventListeners(config, services, bookings, posts, customers);
        }
        
        function renderOwnerView(config, services, bookings, posts, customers) {
            if (currentView === 'stats') {
                return renderStats(config, services, bookings, customers);
            } else if (currentView === 'customers') {
                return renderCustomersManagement(config, customers, bookings);
            } else if (currentView === 'settings') {
                return renderSettings(config);
            }
            
            // Default: manage view
            const filteredBookings = bookings.filter(b => {
                if (filterStatus === 'all') return true;
                return b.status === filterStatus;
            }).filter(b => {
                if (!searchQuery) return true;
                return b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       b.customerPhone.includes(searchQuery) ||
                       b.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
            });
            
            return `
                <div>
                    <!-- Services Management -->
                    <div class="mb-12">
                        <div class="flex justify-between items-center mb-6">
                            <h2 style="font-size: ${config.font_size * 1.8}px; font-weight: 700; color: ${config.primary_action_color};">
                                服务管理
                            </h2>
                            <button id="addServiceBtn" class="btn-primary px-6 py-3 rounded-lg" style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff;">
                                + 添加服务
                            </button>
                        </div>
                        
                        ${services.length === 0 ? `
                            <div class="text-center py-12" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px;">
                                <div style="font-size: 50px;">💅</div>
                                <p style="font-family: Lato, sans-serif; color: ${config.text_color}; opacity: 0.6;">还没有添加服务</p>
                            </div>
                        ` : `
                            <div class="space-y-4">
                                ${services.map(service => {
                                    const rating = getServiceRating(service.id);
                                    const ratingCount = getDataByType('rating').filter(r => r.serviceId === service.id).length;
                                    return `
                                        <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                                            <div style="flex: 1;">
                                                <div class="flex items-center gap-3 mb-2">
                                                    <h3 style="font-size: ${config.font_size * 1.3}px; font-weight: 700; color: ${config.text_color};">
                                                        ${service.name}
                                                    </h3>
                                                    ${rating > 0 ? `
                                                        <div style="font-size: ${config.font_size * 0.85}px;">
                                                            ${renderStars(rating)} <span style="font-family: Lato, sans-serif; color: ${config.text_color}; opacity: 0.6;">(${ratingCount})</span>
                                                        </div>
                                                    ` : ''}
                                                </div>
                                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                                                    ${service.description}
                                                </p>
                                                <p style="font-size: ${config.font_size * 1.1}px; color: ${config.primary_action_color}; font-weight: 700;">
                                                    RM${service.price} | ${service.duration}分钟
                                                </p>
                                            </div>
                                            <button class="deleteServiceBtn" data-id="${service.id}" style="background: #ef4444; color: #ffffff; padding: 8px 20px; border-radius: 8px; font-family: Lato, sans-serif;">
                                                删除
                                            </button>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `}
                    </div>
                    
                    <!-- Posts Management -->
                    <div class="mb-12">
                        <div class="flex justify-between items-center mb-6">
                            <h2 style="font-size: ${config.font_size * 1.8}px; font-weight: 700; color: ${config.primary_action_color};">
                                动态管理
                            </h2>
                            <button id="addPostBtn" class="btn-primary px-6 py-3 rounded-lg" style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff;">
                                + 发布动态
                            </button>
                        </div>
                        
                        ${posts.length === 0 ? `
                            <div class="text-center py-12" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px;">
                                <div style="font-size: 50px;">✨</div>
                                <p style="font-family: Lato, sans-serif; color: ${config.text_color}; opacity: 0.6;">还没有发布动态</p>
                            </div>
                        ` : `
                            <div class="space-y-4">
                                ${posts.map(post => `
                                    <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 12px; display: flex; justify-content: space-between; align-items: start;">
                                        <div style="flex: 1;">
                                            <h3 style="font-size: ${config.font_size * 1.3}px; font-weight: 700; color: ${config.text_color}; margin-bottom: 8px;">
                                                ${post.postTitle}
                                            </h3>
                                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                                                ${post.postContent}
                                            </p>
                                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color}; opacity: 0.5;">
                                                ${new Date(post.createdAt).toLocaleString('zh-CN')}
                                            </p>
                                        </div>
                                        <button class="deletePostBtn" data-id="${post.id}" style="background: #ef4444; color: #ffffff; padding: 8px 20px; border-radius: 8px; font-family: Lato, sans-serif;">
                                            删除
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                    
                    <!-- Bookings Management -->
                    <div>
                        <div class="flex justify-between items-center mb-6">
                            <h2 style="font-size: ${config.font_size * 1.8}px; font-weight: 700; color: ${config.primary_action_color};">
                                预约管理
                            </h2>
                        </div>
                        
                        <!-- Search and Filter -->
                        <div class="mb-6 flex gap-4">
                            <input type="text" id="searchInput" placeholder="搜索客户、电话或服务..." value="${searchQuery}"
                                class="flex-1 px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                            <select id="filterSelect" class="px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                                <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>全部状态</option>
                                <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>����确认</option>
                                <option value="completed" ${filterStatus === 'completed' ? 'selected' : ''}>已完成</option>
                                <option value="cancelled" ${filterStatus === 'cancelled' ? 'selected' : ''}>已取消</option>
                            </select>
                        </div>
                        
                        ${filteredBookings.length === 0 ? `
                            <div class="text-center py-12" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px;">
                                <div style="font-size: 50px;">📅</div>
                                <p style="font-family: Lato, sans-serif; color: ${config.text_color}; opacity: 0.6;">
                                    ${bookings.length === 0 ? '暂无预约记录' : '没有符合条件的预约'}
                                </p>
                            </div>
                        ` : `
                            <div class="space-y-4">
                                ${filteredBookings.map(booking => {
                                    const pointsUsed = booking.points_used || 0;
                                    const settings = getDiscountSettings();
                                    const pointsToRmRate = settings.points_to_rm_rate || 10;
                                    const pointsDiscount = pointsUsed > 0 ? (pointsUsed / pointsToRmRate).toFixed(2) : 0;
                                    
                                    return `
                                    <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 12px;">
                                        <div class="flex justify-between">
                                            <div>
                                                <h3 style="font-size: ${config.font_size * 1.2}px; font-weight: 700; color: ${config.text_color}; margin-bottom: 12px;">
                                                    ${booking.customerName}
                                                </h3>
                                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; margin-bottom: 4px;">
                                                    📞 ${booking.customerPhone}
                                                </p>
                                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; margin-bottom: 4px;">
                                                    💅 ${booking.serviceName}
                                                </p>
                                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; margin-bottom: 4px;">
                                                    📅 ${booking.appointmentDate} ${booking.appointmentTime}
                                                </p>
                                                ${pointsUsed > 0 ? `
                                                    <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.primary_action_color}; margin-bottom: 4px;">
                                                        ⭐ 使用积分: ${pointsUsed} (-RM${pointsDiscount})
                                                    </p>
                                                ` : ''}
                                                <p style="font-size: ${config.font_size * 1.1}px; color: ${config.primary_action_color}; font-weight: 700;">
                                                    RM${booking.totalAmount}
                                                </p>
                                            </div>
                                            <div class="flex flex-col gap-2">
                                                <span style="background: ${booking.status === 'completed' ? '#10b981' : booking.status === 'cancelled' ? '#ef4444' : config.secondary_action_color}; color: #ffffff; padding: 4px 12px; border-radius: 999px; font-size: ${config.font_size * 0.8}px; font-family: Lato, sans-serif; text-align: center;">
                                                    ${booking.status === 'pending' ? '待确认' : booking.status === 'completed' ? '已完成' : '已取消'}
                                                </span>
                                                ${booking.status === 'pending' ? `
                                                    <button class="completeBookingBtn" data-id="${booking.id}" style="background: #10b981; color: #ffffff; padding: 6px 12px; border-radius: 8px; font-size: ${config.font_size * 0.85}px; font-family: Lato, sans-serif;">
                                                        完成
                                                    </button>
                                                    <button class="cancelBookingBtn" data-id="${booking.id}" style="background: #ef4444; color: #ffffff; padding: 6px 12px; border-radius: 8px; font-size: ${config.font_size * 0.85}px; font-family: Lato, sans-serif;">
                                                        取消
                                                    </button>
                                                ` : booking.status === 'completed' ? `
                                                    <button class="rateServiceBtn" data-booking-id="${booking.id}" data-service-id="${booking.serviceId}" style="background: ${config.primary_action_color}; color: #ffffff; padding: 6px 12px; border-radius: 8px; font-size: ${config.font_size * 0.85}px; font-family: Lato, sans-serif;">
                                                        评价
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
                </div>
            `;
        }
        
        function renderStats(config, services, bookings, customers) {
            // Get date filter from global state or default to 'all'
            const dateFilter = window.statsDateFilter || 'all';
            const customStartDate = window.statsStartDate || '';
            const customEndDate = window.statsEndDate || '';
            
            // Filter bookings by date
            let filteredBookings = bookings;
            const now = new Date();
            
            if (dateFilter === 'today') {
                const today = now.toISOString().split('T')[0];
                filteredBookings = bookings.filter(b => b.appointmentDate === today);
            } else if (dateFilter === 'this_week') {
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                const startDate = startOfWeek.toISOString().split('T')[0];
                filteredBookings = bookings.filter(b => b.appointmentDate >= startDate);
            } else if (dateFilter === 'this_month') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startDate = startOfMonth.toISOString().split('T')[0];
                filteredBookings = bookings.filter(b => b.appointmentDate >= startDate);
            } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
                filteredBookings = bookings.filter(b => 
                    b.appointmentDate >= customStartDate && b.appointmentDate <= customEndDate
                );
            }
            
            const totalBookings = filteredBookings.length;
            const completedBookings = filteredBookings.filter(b => b.status === 'completed').length;
            const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
            const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled').length;
            
            const totalRevenue = filteredBookings.filter(b => b.status === 'completed')
                .reduce((sum, b) => sum + b.totalAmount, 0);
            
            const membershipStats = {
                bronze: customers.filter(c => c.membershipLevel === 'bronze').length,
                silver: customers.filter(c => c.membershipLevel === 'silver').length,
                gold: customers.filter(c => c.membershipLevel === 'gold').length,
                platinum: customers.filter(c => c.membershipLevel === 'platinum').length
            };
            
            const serviceStats = services.map(service => {
                const serviceBookings = filteredBookings.filter(b => b.serviceId === service.id && b.status === 'completed');
                return {
                    name: service.name,
                    count: serviceBookings.length,
                    revenue: serviceBookings.reduce((sum, b) => sum + b.totalAmount, 0)
                };
            }).sort((a, b) => b.count - a.count);
            
            const maxServiceCount = Math.max(...serviceStats.map(s => s.count), 1);
            
            return `
                <div>
                    <div class="flex justify-between items-center mb-8">
                        <h2 style="font-size: ${config.font_size * 2}px; font-weight: 700; color: ${config.primary_action_color};">
                            数据统计
                        </h2>
                        <button id="exportPdfBtn" class="btn-primary px-6 py-3 rounded-lg" style="font-family: Lato, sans-serif; background: ${config.secondary_action_color}; color: #ffffff;">
                            📥 导出PDF
                        </button>
                    </div>
                    
                    <!-- Date Filter -->
                    <div class="mb-8" style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h3 class="mb-4" style="font-size: ${config.font_size * 1.2}px; font-weight: 700; color: ${config.text_color};">
                            📅 选择时间段
                        </h3>
                        <div class="flex flex-wrap gap-3 mb-4">
                            <button id="filterAll" class="px-4 py-2 rounded-lg" style="font-family: Lato, sans-serif; background: ${dateFilter === 'all' ? config.primary_action_color : config.primary_action_color + '22'}; color: ${dateFilter === 'all' ? '#ffffff' : config.text_color}; font-size: ${config.font_size * 0.9}px;">
                                全部
                            </button>
                            <button id="filterToday" class="px-4 py-2 rounded-lg" style="font-family: Lato, sans-serif; background: ${dateFilter === 'today' ? config.primary_action_color : config.primary_action_color + '22'}; color: ${dateFilter === 'today' ? '#ffffff' : config.text_color}; font-size: ${config.font_size * 0.9}px;">
                                今天
                            </button>
                            <button id="filterWeek" class="px-4 py-2 rounded-lg" style="font-family: Lato, sans-serif; background: ${dateFilter === 'this_week' ? config.primary_action_color : config.primary_action_color + '22'}; color: ${dateFilter === 'this_week' ? '#ffffff' : config.text_color}; font-size: ${config.font_size * 0.9}px;">
                                本周
                            </button>
                            <button id="filterMonth" class="px-4 py-2 rounded-lg" style="font-family: Lato, sans-serif; background: ${dateFilter === 'this_month' ? config.primary_action_color : config.primary_action_color + '22'}; color: ${dateFilter === 'this_month' ? '#ffffff' : config.text_color}; font-size: ${config.font_size * 0.9}px;">
                                本月
                            </button>
                            <button id="filterCustom" class="px-4 py-2 rounded-lg" style="font-family: Lato, sans-serif; background: ${dateFilter === 'custom' ? config.primary_action_color : config.primary_action_color + '22'}; color: ${dateFilter === 'custom' ? '#ffffff' : config.text_color}; font-size: ${config.font_size * 0.9}px;">
                                自定义
                            </button>
                        </div>
                        
                        ${dateFilter === 'custom' ? `
                            <div class="flex gap-4">
                                <div class="flex-1">
                                    <label for="startDate" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color};">
                                        开始日期
                                    </label>
                                    <input type="date" id="startDate" value="${customStartDate}"
                                        class="w-full px-4 py-2 rounded-lg border-2"
                                        style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; border-color: ${config.text_color}33;">
                                </div>
                                <div class="flex-1">
                                    <label for="endDate" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color};">
                                        结束日期
                                    </label>
                                    <input type="date" id="endDate" value="${customEndDate}"
                                        class="w-full px-4 py-2 rounded-lg border-2"
                                        style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; border-color: ${config.text_color}33;">
                                </div>
                                <div class="flex items-end">
                                    <button id="applyCustomDate" class="px-6 py-2 rounded-lg" style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 0.9}px;">
                                        应用
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Overview Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <div style="font-size: 40px; margin-bottom: 8px;">💰</div>
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.7; margin-bottom: 4px;">
                                总��入
                            </p>
                            <p style="font-size: ${config.font_size * 1.8}px; font-weight: 700; color: ${config.primary_action_color};">
                                RM${totalRevenue.toFixed(2)}
                            </p>
                        </div>
                        
                        <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <div style="font-size: 40px; margin-bottom: 8px;">📅</div>
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.7; margin-bottom: 4px;">
                                总预约数
                            </p>
                            <p style="font-size: ${config.font_size * 1.8}px; font-weight: 700; color: ${config.primary_action_color};">
                                ${totalBookings}
                            </p>
                        </div>
                        
                        <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <div style="font-size: 40px; margin-bottom: 8px;">✅</div>
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.7; margin-bottom: 4px;">
                                已完成
                            </p>
                            <p style="font-size: ${config.font_size * 1.8}px; font-weight: 700; color: ${config.primary_action_color};">
                                ${completedBookings}
                            </p>
                        </div>
                        
                        <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <div style="font-size: 40px; margin-bottom: 8px;">👥</div>
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.7; margin-bottom: 4px;">
                                注册客户
                            </p>
                            <p style="font-size: ${config.font_size * 1.8}px; font-weight: 700; color: ${config.primary_action_color};">
                                ${customers.length}
                            </p>
                        </div>
                    </div>
                    
                    <!-- Booking Status -->
                    <div class="mb-12" style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h3 class="mb-6" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.text_color};">
                            预约状态分布
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <div class="flex justify-between mb-2">
                                    <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color};">待确认</span>
                                    <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; font-weight: 600;">${pendingBookings}</span>
                                </div>
                                <div style="background: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden;">
                                    <div class="stat-bar" style="width: ${totalBookings > 0 ? (pendingBookings / totalBookings * 100) : 0}%; background: ${config.secondary_action_color};"></div>
                                </div>
                            </div>
                            
                            <div>
                                <div class="flex justify-between mb-2">
                                    <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color};">已完成</span>
                                    <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; font-weight: 600;">${completedBookings}</span>
                                </div>
                                <div style="background: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden;">
                                    <div class="stat-bar" style="width: ${totalBookings > 0 ? (completedBookings / totalBookings * 100) : 0}%; background: #10b981;"></div>
                                </div>
                            </div>
                            
                            <div>
                                <div class="flex justify-between mb-2">
                                    <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color};">已取消</span>
                                    <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; font-weight: 600;">${cancelledBookings}</span>
                                </div>
                                <div style="background: #e5e7eb; height: 24px; border-radius: 12px; overflow: hidden;">
                                    <div class="stat-bar" style="width: ${totalBookings > 0 ? (cancelledBookings / totalBookings * 100) : 0}%; background: #ef4444;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Service Popularity -->
                    ${serviceStats.length > 0 ? `
                        <div class="mb-12" style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            <h3 class="mb-6" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.text_color};">
                                热门服务排行
                            </h3>
                            <div class="space-y-4">
                                ${serviceStats.map((stat, index) => `
                                    <div>
                                        <div class="flex justify-between mb-2">
                                            <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color};">
                                                ${index + 1}. ${stat.name}
                                            </span>
                                            <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; font-weight: 600;">
                                                ${stat.count}次 (RM${stat.revenue.toFixed(2)})
                                            </span>
                                        </div>
                                        <div style="background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden;">
                                            <div class="stat-bar" style="width: ${(stat.count / maxServiceCount * 100)}%; background: ${config.primary_action_color};"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Membership Distribution -->
                    <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h3 class="mb-6" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.text_color};">
                            会员等级分布
                        </h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="text-center p-4" style="background: linear-gradient(135deg, #cd7f3222 0%, #cd7f3211 100%); border-radius: 12px;">
                                <div style="font-size: 32px; margin-bottom: 8px;">🥉</div>
                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color}; opacity: 0.7; margin-bottom: 4px;">
                                    铜牌会员
                                </p>
                                <p style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.text_color};">
                                    ${membershipStats.bronze}
                                </p>
                            </div>
                            
                            <div class="text-center p-4" style="background: linear-gradient(135deg, #c0c0c022 0%, #c0c0c011 100%); border-radius: 12px;">
                                <div style="font-size: 32px; margin-bottom: 8px;">🥈</div>
                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color}; opacity: 0.7; margin-bottom: 4px;">
                                    银牌会员
                                </p>
                                <p style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.text_color};">
                                    ${membershipStats.silver}
                                </p>
                            </div>
                            
                            <div class="text-center p-4" style="background: linear-gradient(135deg, #ffd70022 0%, #ffd70011 100%); border-radius: 12px;">
                                <div style="font-size: 32px; margin-bottom: 8px;">🥇</div>
                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color}; opacity: 0.7; margin-bottom: 4px;">
                                    金牌会员
                                </p>
                                <p style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.text_color};">
                                    ${membershipStats.gold}
                                </p>
                            </div>
                            
                            <div class="text-center p-4" style="background: linear-gradient(135deg, #e5e4e222 0%, #e5e4e211 100%); border-radius: 12px;">
                                <div style="font-size: 32px; margin-bottom: 8px;">💎</div>
                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color}; opacity: 0.7; margin-bottom: 4px;">
                                    白金会员
                                </p>
                                <p style="font-size: ${config.font_size * 1.5}px; font-weight: 700; color: ${config.text_color};">
                                    ${membershipStats.platinum}
                                </p>
                            </div>
                        </div>
                    </div>
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
                                            🎁 ��扣: ${getMembershipDiscountText(customer.membershipLevel)}
                                        </p>
                                        <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                                            📅 预约次数: ${customerBookings.length}
                                        </p>
                                        <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 12px;">
                                            ✅ 完成次数: ${completedBookings.length}
                                        </p>
                                        <div class="flex gap-2">
                                            <button class="editCustomerBtn flex-1 py-2 rounded-lg" data-customer-id="${customer.__backendId}"
                                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 0.9}px;">
                                                ✏️ 编辑
                                            </button>
                                            <button class="deleteCustomerBtn py-2 px-4 rounded-lg" data-customer-id="${customer.__backendId}"
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
                    
                    <!-- Password Change -->
                    <div class="mb-8" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 32px; max-width: 600px;">
                        <h3 class="mb-6" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.text_color};">
                            修改业主密码
                        </h3>
                        
                        <form id="changePasswordForm">
                            <div class="mb-4">
                                <label for="currentPassword" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                    当前密码
                                </label>
                                <input type="password" id="currentPassword" required
                                    class="w-full px-4 py-3 rounded-lg border-2"
                                    style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                            </div>
                            
                            <div class="mb-4">
                                <label for="newPassword" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                    新密码
                                </label>
                                <input type="password" id="newPassword" required
                                    class="w-full px-4 py-3 rounded-lg border-2"
                                    style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                            </div>
                            
                            <div class="mb-6">
                                <label for="confirmPassword" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                    确认新密码
                                </label>
                                <input type="password" id="confirmPassword" required
                                    class="w-full px-4 py-3 rounded-lg border-2"
                                    style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                            </div>
                            
                            <button type="submit" class="btn-primary px-8 py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                更新密码
                            </button>
                        </form>
                    </div>
                    
                    <!-- Points Exchange Rate Settings -->
                    <div class="mb-8" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 32px; max-width: 600px;">
                        <h3 class="mb-6" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.text_color};">
                            💰 积分兑换率设置
                        </h3>
                        
                        <form id="pointsRateForm">
                            <div class="mb-4" style="padding: 16px; background: ${config.primary_action_color}11; border-radius: 12px;">
                                <label for="pointsToRmRate" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                    多少积分 = 1 RM
                                </label>
                                <input type="number" id="pointsToRmRate" value="${discountSettings.points_to_rm_rate || 10}" min="1"
                                    class="w-full px-4 py-3 rounded-lg border-2"
                                    style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color}; opacity: 0.7; margin-top: 8px;">
                                    例如：设置为10表��10积分可抵扣1RM
                                </p>
                            </div>
                            
                            <button type="submit" class="btn-primary px-8 py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                保存兑换率设置
                            </button>
                        </form>
                    </div>
                    
                    <!-- Discount Settings -->
                    <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 32px; max-width: 600px;">
                        <h3 class="mb-6" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.text_color};">
                            🎁 会员折扣设置
                        </h3>
                        
                        <form id="discountSettingsForm">
                            <div class="mb-6" style="padding: 16px; background: ${config.primary_action_color}11; border-radius: 12px; border-left: 4px solid ${config.primary_action_color};">
                                <h4 style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; font-weight: 600; margin-bottom: 12px;">
                                    🥉 铜牌会员
                                </h4>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label for="bronzePoints" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color};">
                                            所需积分
                                        </label>
                                        <input type="number" id="bronzePoints" value="${discountSettings.bronze_points}" min="0"
                                            class="w-full px-3 py-2 rounded-lg border-2"
                                            style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; border-color: ${config.text_color}33;">
                                    </div>
                                    <div>
                                        <label for="bronzeDiscount" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color};">
                                            折扣 (%)
                                        </label>
                                        <input type="number" id="bronzeDiscount" value="${discountSettings.bronze_discount}" min="0" max="100"
                                            class="w-full px-3 py-2 rounded-lg border-2"
                                            style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; border-color: ${config.text_color}33;">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-6" style="padding: 16px; background: ${config.primary_action_color}11; border-radius: 12px; border-left: 4px solid ${config.primary_action_color};">
                                <h4 style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; font-weight: 600; margin-bottom: 12px;">
                                    🥈 银牌会员
                                </h4>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label for="silverPoints" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color};">
                                            所需积分
                                        </label>
                                        <input type="number" id="silverPoints" value="${discountSettings.silver_points}" min="0"
                                            class="w-full px-3 py-2 rounded-lg border-2"
                                            style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; border-color: ${config.text_color}33;">
                                    </div>
                                    <div>
                                        <label for="silverDiscount" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color};">
                                            折扣 (%)
                                        </label>
                                        <input type="number" id="silverDiscount" value="${discountSettings.silver_discount}" min="0" max="100"
                                            class="w-full px-3 py-2 rounded-lg border-2"
                                            style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; border-color: ${config.text_color}33;">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-6" style="padding: 16px; background: ${config.primary_action_color}11; border-radius: 12px; border-left: 4px solid ${config.primary_action_color};">
                                <h4 style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; font-weight: 600; margin-bottom: 12px;">
                                    🥇 金牌会员
                                </h4>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label for="goldPoints" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color};">
                                            所需积分
                                        </label>
                                        <input type="number" id="goldPoints" value="${discountSettings.gold_points}" min="0"
                                            class="w-full px-3 py-2 rounded-lg border-2"
                                            style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; border-color: ${config.text_color}33;">
                                    </div>
                                    <div>
                                        <label for="goldDiscount" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color};">
                                            折扣 (%)
                                        </label>
                                        <input type="number" id="goldDiscount" value="${discountSettings.gold_discount}" min="0" max="100"
                                            class="w-full px-3 py-2 rounded-lg border-2"
                                            style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; border-color: ${config.text_color}33;">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="mb-6" style="padding: 16px; background: ${config.primary_action_color}11; border-radius: 12px; border-left: 4px solid ${config.primary_action_color};">
                                <h4 style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; font-weight: 600; margin-bottom: 12px;">
                                    💎 白金会员
                                </h4>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label for="platinumPoints" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color};">
                                            所需积分
                                        </label>
                                        <input type="number" id="platinumPoints" value="${discountSettings.platinum_points}" min="0"
                                            class="w-full px-3 py-2 rounded-lg border-2"
                                            style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; border-color: ${config.text_color}33;">
                                    </div>
                                    <div>
                                        <label for="platinumDiscount" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color};">
                                            折扣 (%)
                                        </label>
                                        <input type="number" id="platinumDiscount" value="${discountSettings.platinum_discount}" min="0" max="100"
                                            class="w-full px-3 py-2 rounded-lg border-2"
                                            style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; border-color: ${config.text_color}33;">
                                    </div>
                                </div>
                            </div>
                            
                            <button type="submit" class="btn-primary px-8 py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                保存折扣设置
                            </button>
                        </form>
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
            
            // Default: services view
            const customerAccount = loggedInCustomerName ? 
                getDataByType('customer_account').find(acc => acc.username === loggedInCustomerName) : null;
            const memberDiscount = customerAccount ? getMembershipDiscount(customerAccount.membershipLevel) : 0;
            
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
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 1.1}px; color: ${config.text_color}; opacity: 0.6;">
                                精彩服务即将推出
                            </p>
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            ${services.map(service => {
                                const rating = getServiceRating(service.id);
                                const ratingCount = getDataByType('rating').filter(r => r.serviceId === service.id).length;
                                const originalPrice = service.price;
                                const discountedPrice = memberDiscount > 0 ? (originalPrice * (1 - memberDiscount)).toFixed(2) : null;
                                
                                return `
                                    <div class="service-card" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                        <div style="height: 224px; background: linear-gradient(135deg, ${config.primary_action_color}22 0%, ${config.secondary_action_color}22 100%); display: flex; align-items: center; justify-content: center; font-size: ${config.font_size * 4}px;">
                                            💅
                                        </div>
                                        <div class="p-6">
                                            <h3 class="mb-2" style="font-size: ${config.font_size * 1.4}px; font-weight: 700; color: ${config.primary_action_color};">
                                                ${service.name}
                                            </h3>
                                            ${rating > 0 ? `
                                                <div class="mb-3" style="font-size: ${config.font_size * 0.85}px;">
                                                    ${renderStars(rating)} <span style="font-family: Lato, sans-serif; color: ${config.text_color}; opacity: 0.6;">${rating} (${ratingCount})</span>
                                                </div>
                                            ` : ''}
                                            <p class="mb-4" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; opacity: 0.8;">
                                                ${service.description}
                                            </p>
                                            <p class="mb-4" style="font-size: ${config.font_size * 1.5}px; color: ${config.primary_action_color}; font-weight: 700;">
                                                ${discountedPrice ? `
                                                    <span style="text-decoration: line-through; opacity: 0.5; font-size: ${config.font_size * 1.1}px;">RM${originalPrice}</span>
                                                    <span style="margin-left: 8px;">RM${discountedPrice}</span>
                                                ` : `RM${originalPrice}`}
                                                <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; font-weight: 400;"> | ${service.duration}分钟</span>
                                            </p>
                                            <button class="bookServiceBtn btn-primary w-full py-3 rounded-lg" 
                                                data-service-id="${service.id}"
                                                data-service-name="${service.name}"
                                                data-service-price="${discountedPrice || originalPrice}"
                                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff;">
                                                立即预约 ✨
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                    
                    <!-- Posts Section -->
                    <h2 class="mt-16 mb-8 text-center" style="font-size: ${config.font_size * 2}px; font-weight: 700; background: linear-gradient(135deg, ${config.primary_action_color} 0%, ${config.secondary_action_color} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
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
                            ${posts.map(post => `
                                <div style="background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                    <h3 class="mb-4" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                                        ${post.postTitle}
                                    </h3>
                                    <p class="mb-4" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 1.05}px; color: ${config.text_color}; opacity: 0.8; line-height: 1.8;">
                                        ${post.postContent}
                                    </p>
                                    <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color}; opacity: 0.5;">
                                        ${new Date(post.createdAt).toLocaleString('zh-CN')}
                                    </p>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `;
        }
        
        function renderMyBookings(config, bookings) {
            const myBookings = bookings.filter(b => b.customerName === loggedInCustomerName);
            const settings = getDiscountSettings();
            const pointsToRmRate = settings.points_to_rm_rate || 10;
            
            return `
                <div>
                    <h2 class="mb-8" style="font-size: ${config.font_size * 2}px; font-weight: 700; color: ${config.primary_action_color};">
                        我的预约
                    </h2>
                    
                    ${myBookings.length === 0 ? `
                        <div class="text-center py-16" style="background: rgba(255, 255, 255, 0.95); border-radius: 16px;">
                            <div style="font-size: 60px;">📅</div>
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 1.1}px; color: ${config.text_color}; opacity: 0.6;">
                                您还没有预约记录
                            </p>
                        </div>
                    ` : `
                        <div class="space-y-4">
                            ${myBookings.map(booking => {
                                const hasRated = getDataByType('rating').some(r => 
                                    r.serviceId === booking.serviceId && r.customerName === loggedInCustomerName
                                );
                                const pointsUsed = booking.points_used || 0;
                                const pointsDiscount = pointsUsed > 0 ? (pointsUsed / pointsToRmRate).toFixed(2) : 0;
                                
                                return `
                                    <div style="background: rgba(255, 255, 255, 0.95); padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <h3 style="font-size: ${config.font_size * 1.3}px; font-weight: 700; color: ${config.text_color}; margin-bottom: 12px;">
                                                    ${booking.serviceName}
                                                </h3>
                                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; margin-bottom: 4px;">
                                                    📅 ${booking.appointmentDate} ${booking.appointmentTime}
                                                </p>
                                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.95}px; color: ${config.text_color}; margin-bottom: 4px;">
                                                    📞 ${booking.customerPhone}
                                                </p>
                                                ${pointsUsed > 0 ? `
                                                    <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.primary_action_color}; margin-bottom: 4px;">
                                                        ⭐ 使用积分: ${pointsUsed} (-RM${pointsDiscount})
                                                    </p>
                                                ` : ''}
                                                <p style="font-size: ${config.font_size * 1.1}px; color: ${config.primary_action_color}; font-weight: 700;">
                                                    RM${booking.totalAmount}
                                                </p>
                                            </div>
                                            <div class="flex flex-col gap-2 items-end">
                                                <span style="background: ${booking.status === 'completed' ? '#10b981' : booking.status === 'cancelled' ? '#ef4444' : config.secondary_action_color}; color: #ffffff; padding: 8px 16px; border-radius: 999px; font-size: ${config.font_size * 0.85}px; font-family: Lato, sans-serif;">
                                                    ${booking.status === 'pending' ? '待确认' : booking.status === 'completed' ? '已完成' : '已取消'}
                                                </span>
                                                ${booking.status === 'completed' && !hasRated ? `
                                                    <button class="rateServiceBtnCustomer" data-booking-id="${booking.id}" data-service-id="${booking.serviceId}" style="background: ${config.primary_action_color}; color: #ffffff; padding: 6px 16px; border-radius: 8px; font-size: ${config.font_size * 0.85}px; font-family: Lato, sans-serif;">
                                                        ⭐ 评价
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
            `;
        }
        
        function renderProfile(config, bookings) {
            const customerAccount = getDataByType('customer_account').find(acc => acc.username === loggedInCustomerName);
            if (!customerAccount) return '';
            
            const myBookings = bookings.filter(b => b.customerName === loggedInCustomerName);
            const completedBookings = myBookings.filter(b => b.status === 'completed');
            const discount = getMembershipDiscount(customerAccount.membershipLevel);
            const settings = getDiscountSettings();
            
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
                                ${getMembershipBadge(customerAccount.membershipLevel, config)}
                            </div>
                            
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                                📧 ${customerAccount.email}
                            </p>
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                                ⭐ 积分: ${customerAccount.points}
                            </p>
                            <p style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color}; opacity: 0.8; margin-bottom: 8px;">
                                🎁 当前折扣: <span style="color: ${config.primary_action_color}; font-weight: 700;">${getMembershipDiscountText(customerAccount.membershipLevel)}</span>
                            </p>
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
                            
                            <h4 style="font-size: ${config.font_size * 1.2}px; font-weight: 700; color: ${config.text_color}; margin-top: 16px; margin-bottom: 12px;">
                                积分使用说明
                            </h4>
                            <div class="space-y-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; opacity: 0.8;">
                                <p>💰 ���分兑换: ${settings.points_to_rm_rate || 10}积分 = 1 RM</p>
                                <p>✨ 您可以在预约时使用积分抵扣费用</p>
                                <p>🎁 每次完成服务可获得相应���分奖励</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        function attachEventListeners(config, services, bookings, posts, customers) {
            // Menu buttons
            document.getElementById('menuBtn')?.addEventListener('click', () => {
                showMenu = !showMenu;
                renderApp();
            });
            
            document.getElementById('menuOverlay')?.addEventListener('click', (e) => {
                if (e.target.id === 'menuOverlay') {
                    showMenu = false;
                    renderApp();
                }
            });
            
            document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
            
            // View switching
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
            
            // Date filter buttons
            document.getElementById('filterAll')?.addEventListener('click', () => {
                window.statsDateFilter = 'all';
                renderApp();
            });
            
            document.getElementById('filterToday')?.addEventListener('click', () => {
                window.statsDateFilter = 'today';
                renderApp();
            });
            
            document.getElementById('filterWeek')?.addEventListener('click', () => {
                window.statsDateFilter = 'this_week';
                renderApp();
            });
            
            document.getElementById('filterMonth')?.addEventListener('click', () => {
                window.statsDateFilter = 'this_month';
                renderApp();
            });
            
            document.getElementById('filterCustom')?.addEventListener('click', () => {
                window.statsDateFilter = 'custom';
                renderApp();
            });
            
            document.getElementById('applyCustomDate')?.addEventListener('click', () => {
                window.statsStartDate = document.getElementById('startDate').value;
                window.statsEndDate = document.getElementById('endDate').value;
                renderApp();
            });
            
            // Export PDF button
            document.getElementById('exportPdfBtn')?.addEventListener('click', () => {
                exportStatsToPDF(config, services, bookings, customers);
            });
            
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
            
            // Add customer
            document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
                showAddCustomerModal(config);
            });
            
            // Edit customer profile (owner)
            document.querySelectorAll('.editCustomerBtn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const customer = customers.find(c => c.__backendId === btn.dataset.customerId);
                    if (customer) {
                        showEditCustomerModal(config, customer);
                    }
                });
            });
            
            // Delete customer
            document.querySelectorAll('.deleteCustomerBtn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const customer = customers.find(c => c.__backendId === btn.dataset.customerId);
                    if (customer) {
                        showConfirmModal(config, `确定要删除客户 "${customer.username}" 吗？此操作无法撤销。`, async () => {
                            await deleteRecord(customer);
                        });
                    }
                });
            });
            
            // Edit own profile (customer)
            document.getElementById('editProfileBtn')?.addEventListener('click', () => {
                const customerAccount = getDataByType('customer_account').find(acc => acc.username === loggedInCustomerName);
                if (customerAccount) {
                    showEditProfileModal(config, customerAccount);
                }
            });
            
            // Search and filter
            document.getElementById('searchInput')?.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderApp();
            });
            
            document.getElementById('filterSelect')?.addEventListener('change', (e) => {
                filterStatus = e.target.value;
                renderApp();
            });
            
            // Service management
            document.getElementById('addServiceBtn')?.addEventListener('click', () => {
                showServiceModal(config);
            });
            
            document.querySelectorAll('.deleteServiceBtn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const service = services.find(s => s.id === btn.dataset.id);
                    if (service) {
                        showConfirmModal(config, '确定要删除这个服务吗？', async () => {
                            await deleteRecord(service);
                        });
                    }
                });
            });
            
            // Post management
            document.getElementById('addPostBtn')?.addEventListener('click', () => {
                showPostModal(config);
            });
            
            document.querySelectorAll('.deletePostBtn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const post = posts.find(p => p.id === btn.dataset.id);
                    if (post) {
                        showConfirmModal(config, '确定���删除这条动态吗？', async () => {
                            await deleteRecord(post);
                        });
                    }
                });
            });
            
            // Booking management
            document.querySelectorAll('.bookServiceBtn').forEach(btn => {
                btn.addEventListener('click', () => {
                    showBookingModal(config, btn.dataset.serviceId, btn.dataset.serviceName, btn.dataset.servicePrice);
                });
            });
            
            document.querySelectorAll('.completeBookingBtn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const booking = bookings.find(b => b.id === btn.dataset.id);
                    if (booking) {
                        await updateRecord(booking, { status: 'completed' });
                        
                        // Award points to customer if they have an account
                        const customerAccount = getDataByType('customer_account').find(
                            acc => acc.username === booking.customerName
                        );
                        if (customerAccount) {
                            const pointsEarned = Math.floor(booking.totalAmount);
                            const newPoints = customerAccount.points + pointsEarned;
                            const newLevel = calculateMembershipLevel(newPoints);
                            
                            await updateRecord(customerAccount, {
                                points: newPoints,
                                membershipLevel: newLevel
                            });
                        }
                    }
                });
            });
            
            document.querySelectorAll('.cancelBookingBtn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const booking = bookings.find(b => b.id === btn.dataset.id);
                    if (booking) {
                        showConfirmModal(config, '确定要取消这个预约吗？', async () => {
                            await updateRecord(booking, { status: 'cancelled' });
                        });
                    }
                });
            });
            
            // Rating buttons
            document.querySelectorAll('.rateServiceBtn, .rateServiceBtnCustomer').forEach(btn => {
                btn.addEventListener('click', () => {
                    showRatingModal(config, btn.dataset.serviceId);
                });
            });
            
            // Change password form
            document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const currentPassword = document.getElementById('currentPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                if (currentPassword !== ownerCredentials.password) {
                    showToast('当前密码错误');
                    return;
                }
                
                if (newPassword !== confirmPassword) {
                    showToast('两次输入的密码不一致');
                    return;
                }
                
                if (newPassword.length < 4) {
                    showToast('密码至少需要4个字符');
                    return;
                }
                
                // Check if credentials record exists
                const credRecord = getDataByType('owner_credentials')[0];
                if (credRecord) {
                    await updateRecord(credRecord, { password: newPassword });
                } else {
                    await createRecord({
                        type: 'owner_credentials',
                        username: ownerCredentials.username,
                        password: newPassword
                    });
                }
                
                document.getElementById('changePasswordForm').reset();
            });
            
            // Points rate form
            document.getElementById('pointsRateForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const pointsToRmRate = parseInt(document.getElementById('pointsToRmRate').value);
                
                if (pointsToRmRate < 1) {
                    showToast('兑换率必须大于0');
                    return;
                }
                
                const existingSettings = getDataByType('discount_settings')[0];
                if (existingSettings) {
                    await updateRecord(existingSettings, { points_to_rm_rate: pointsToRmRate });
                } else {
                    await createRecord({
                        type: 'discount_settings',
                        points_to_rm_rate: pointsToRmRate,
                        bronze_points: 0,
                        bronze_discount: 0,
                        silver_points: 100,
                        silver_discount: 5,
                        gold_points: 300,
                        gold_discount: 10,
                        platinum_points: 600,
                        platinum_discount: 15
                    });
                }
            });
            
            // Discount settings form
            document.getElementById('discountSettingsForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const newSettings = {
                    type: 'discount_settings',
                    bronze_points: parseInt(document.getElementById('bronzePoints').value),
                    bronze_discount: parseInt(document.getElementById('bronzeDiscount').value),
                    silver_points: parseInt(document.getElementById('silverPoints').value),
                    silver_discount: parseInt(document.getElementById('silverDiscount').value),
                    gold_points: parseInt(document.getElementById('goldPoints').value),
                    gold_discount: parseInt(document.getElementById('goldDiscount').value),
                    platinum_points: parseInt(document.getElementById('platinumPoints').value),
                    platinum_discount: parseInt(document.getElementById('platinumDiscount').value)
                };
                
                const existingSettings = getDataByType('discount_settings')[0];
                if (existingSettings) {
                    await updateRecord(existingSettings, newSettings);
                } else {
                    await createRecord(newSettings);
                }
                
                // Update all customers' membership levels based on new point thresholds
                const customers = getDataByType('customer_account');
                for (const customer of customers) {
                    const newLevel = calculateMembershipLevel(customer.points);
                    if (newLevel !== customer.membershipLevel) {
                        await updateRecord(customer, { membershipLevel: newLevel });
                    }
                }
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
                                ���始密码
                            </label>
                            <input type="password" id="newCustomerPassword" required
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-6">
                            <label for="newCustomerPoints" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                ��始积分
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
                <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
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
                            <input type="number" id="serviceDuration" required min="1"
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
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
            
            document.getElementById('serviceForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const success = await createRecord({
                    type: 'service',
                    name: document.getElementById('serviceName').value,
                    price: parseFloat(document.getElementById('servicePrice').value),
                    duration: parseInt(document.getElementById('serviceDuration').value),
                    description: document.getElementById('serviceDescription').value,
                    imageUrl: ''
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
                                取���
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
            
            const modal = document.createElement('div');
            modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
            modal.innerHTML = `
                <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 500px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <h3 class="mb-6" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                        预约 ${serviceName}
                    </h3>
                    
                    <form id="bookingForm">
                        <div class="mb-4">
                            <label for="customerName" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                姓名
                            </label>
                            <input type="text" id="customerName" required value="${loggedInCustomerName}"
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-4">
                            <label for="customerPhone" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                电话
                            </label>
                            <input type="tel" id="customerPhone" required
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-4">
                            <label for="appointmentDate" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                预约������
                            </label>
                            <input type="date" id="appointmentDate" required
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-4">
                            <label for="appointmentTime" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                预约时间
                            </label>
                            <input type="time" id="appointmentTime" required
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        ${customerAccount ? `
                            <div class="mb-4" style="padding: 16px; background: ${config.primary_action_color}11; border-radius: 12px;">
                                <div class="flex justify-between items-center mb-2">
                                    <label for="pointsToUse" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                        使用积分 (可用: ${availablePoints}分)
                                    </label>
                                    <button type="button" id="useMaxPointsBtn" 
                                        style="font-family: Lato, sans-serif; background: ${config.secondary_action_color}; color: #ffffff; padding: 6px 16px; border-radius: 8px; font-size: ${config.font_size * 0.85}px; font-weight: 600;">
                                        使用最大值
                                    </button>
                                </div>
                                <input type="number" id="pointsToUse" value="0" min="0" max="${availablePoints}"
                                    class="w-full px-4 py-3 rounded-lg border-2"
                                    style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                                <p style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.85}px; color: ${config.text_color}; opacity: 0.7; margin-top: 8px;">
                                    兑换率: ${pointsToRmRate}积分 = 1 RM
                                </p>
                            </div>
                            
                            <div class="mb-6" style="padding: 16px; background: ${config.secondary_action_color}11; border-radius: 12px;">
                                <div class="flex justify-between mb-2">
                                    <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color};">原价:</span>
                                    <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color};">RM${servicePrice}</span>
                                </div>
                                <div class="flex justify-between mb-2">
                                    <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color};">积分抵扣:</span>
                                    <span id="pointsDiscount" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.primary_action_color};">-RM0.00</span>
                                </div>
                                <div class="flex justify-between" style="padding-top: 8px; border-top: 2px solid ${config.primary_action_color}44;">
                                    <span style="font-family: Lato, sans-serif; font-size: ${config.font_size * 1.1}px; color: ${config.text_color}; font-weight: 700;">最终价格:</span>
                                    <span id="finalPrice" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 1.1}px; color: ${config.primary_action_color}; font-weight: 700;">RM${servicePrice}</span>
                                </div>
                            </div>
                        ` : `<div class="mb-6"></div>`}
                        
                        <div class="flex gap-3">
                            <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                确认预约
                            </button>
                            <button type="button" id="cancelBookingBtn" class="flex-1 py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">
                                取消
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Update price calculation when points input changes
            const pointsInput = document.getElementById('pointsToUse');
            if (pointsInput) {
                pointsInput.addEventListener('input', () => {
                    const pointsUsed = parseInt(pointsInput.value) || 0;
                    const pointsDiscount = (pointsUsed / pointsToRmRate).toFixed(2);
                    const finalPrice = Math.max(0, parseFloat(servicePrice) - parseFloat(pointsDiscount)).toFixed(2);
                    
                    document.getElementById('pointsDiscount').textContent = `-RM${pointsDiscount}`;
                    document.getElementById('finalPrice').textContent = `RM${finalPrice}`;
                });
            }
            
            // Use maximum points button
            const useMaxPointsBtn = document.getElementById('useMaxPointsBtn');
            if (useMaxPointsBtn && pointsInput) {
                useMaxPointsBtn.addEventListener('click', () => {
                    // Calculate max points that can be used (cannot exceed service price)
                    const maxPointsByPrice = Math.floor(parseFloat(servicePrice) * pointsToRmRate);
                    const maxPoints = Math.min(availablePoints, maxPointsByPrice);
                    
                    pointsInput.value = maxPoints;
                    
                    // Trigger price update
                    const pointsDiscount = (maxPoints / pointsToRmRate).toFixed(2);
                    const finalPrice = Math.max(0, parseFloat(servicePrice) - parseFloat(pointsDiscount)).toFixed(2);
                    
                    document.getElementById('pointsDiscount').textContent = `-RM${pointsDiscount}`;
                    document.getElementById('finalPrice').textContent = `RM${finalPrice}`;
                });
            }
            
            document.getElementById('bookingForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const pointsUsed = customerAccount ? (parseInt(document.getElementById('pointsToUse').value) || 0) : 0;
                const pointsDiscount = (pointsUsed / pointsToRmRate);
                const finalPrice = Math.max(0, parseFloat(servicePrice) - pointsDiscount);
                
                // Validate points
                if (pointsUsed > availablePoints) {
                    showToast('积分不足');
                    return;
                }
                
                const success = await createRecord({
                    type: 'booking',
                    customerName: document.getElementById('customerName').value,
                    customerPhone: document.getElementById('customerPhone').value,
                    serviceId: serviceId,
                    serviceName: serviceName,
                    appointmentDate: document.getElementById('appointmentDate').value,
                    appointmentTime: document.getElementById('appointmentTime').value,
                    status: 'pending',
                    totalAmount: parseFloat(finalPrice.toFixed(2)),
                    points_used: pointsUsed
                });
                
                if (success) {
                    // Deduct points from customer account
                    if (customerAccount && pointsUsed > 0) {
                        await updateRecord(customerAccount, {
                            points: customerAccount.points - pointsUsed
                        });
                    }
                    modal.remove();
                }
            });
            
            document.getElementById('cancelBookingBtn').addEventListener('click', () => {
                modal.remove();
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
        
        function showRatingModal(config, serviceId) {
            const modal = document.createElement('div');
            modal.className = 'modal-backdrop fixed inset-0 flex items-center justify-center z-50 p-4';
            modal.innerHTML = `
                <div style="background: rgba(255, 255, 255, 0.95); padding: 32px; border-radius: 16px; max-width: 400px; width: 100%; border: 3px solid ${config.primary_action_color}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <h3 class="mb-6 text-center" style="font-size: ${config.font_size * 1.6}px; font-weight: 700; color: ${config.primary_action_color};">
                        服务评价
                    </h3>
                    
                    <form id="ratingForm">
                        <div class="mb-6 text-center">
                            <p class="mb-4" style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; color: ${config.text_color};">
                                请为此次服务打分
                            </p>
                            <div id="starRating" class="flex justify-center gap-2" style="font-size: 48px; cursor: pointer;">
                                <span class="star" data-rating="1">☆</span>
                                <span class="star" data-rating="2">☆</span>
                                <span class="star" data-rating="3">☆</span>
                                <span class="star" data-rating="4">☆</span>
                                <span class="star" data-rating="5">☆</span>
                            </div>
                            <input type="hidden" id="ratingValue" required>
                        </div>
                        
                        <div class="flex gap-3">
                            <button type="submit" class="flex-1 btn-primary py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: ${config.primary_action_color}; color: #ffffff; font-size: ${config.font_size * 1.1}px;">
                                提交评价
                            </button>
                            <button type="button" id="cancelRatingBtn" class="flex-1 py-3 rounded-lg"
                                style="font-family: Lato, sans-serif; background: transparent; color: ${config.text_color}; font-size: ${config.font_size * 1.1}px; border: 2px solid ${config.text_color};">
                                取消
                            </button>
                        </div>
                    </form>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            let selectedRating = 0;
            const stars = modal.querySelectorAll('.star');
            
            stars.forEach(star => {
                star.addEventListener('click', () => {
                    selectedRating = parseInt(star.dataset.rating);
                    document.getElementById('ratingValue').value = selectedRating;
                    
                    stars.forEach((s, index) => {
                        if (index < selectedRating) {
                            s.textContent = '★';
                            s.style.color = '#fbbf24';
                        } else {
                            s.textContent = '☆';
                            s.style.color = '#d1d5db';
                        }
                    });
                });
                
                star.addEventListener('mouseenter', () => {
                    const hoverRating = parseInt(star.dataset.rating);
                    stars.forEach((s, index) => {
                        if (index < hoverRating) {
                            s.textContent = '★';
                            s.style.color = '#fbbf24';
                        } else {
                            s.textContent = '☆';
                            s.style.color = '#d1d5db';
                        }
                    });
                });
                
                star.addEventListener('mouseleave', () => {
                    stars.forEach((s, index) => {
                        if (index < selectedRating) {
                            s.textContent = '★';
                            s.style.color = '#fbbf24';
                        } else {
                            s.textContent = '☆';
                            s.style.color = '#d1d5db';
                        }
                    });
                });
            });
            
            document.getElementById('ratingForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (selectedRating === 0) {
                    showToast('请选择评分');
                    return;
                }
                
                const success = await createRecord({
                    type: 'rating',
                    serviceId: serviceId,
                    rating: selectedRating,
                    customerName: loggedInCustomerName || 'Anonymous'
                });
                
                if (success) {
                    modal.remove();
                }
            });
            
            document.getElementById('cancelRatingBtn').addEventListener('click', () => {
                modal.remove();
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
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
                            <label for="editProfileEmail" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                邮箱
                            </label>
                            <input type="email" id="editProfileEmail" required value="${customer.email}"
                                class="w-full px-4 py-3 rounded-lg border-2"
                                style="font-family: Lato, sans-serif; font-size: ${config.font_size}px; border-color: ${config.text_color}33;">
                        </div>
                        
                        <div class="mb-6">
                            <label for="editProfilePassword" class="block mb-2" style="font-family: Lato, sans-serif; font-size: ${config.font_size * 0.9}px; color: ${config.text_color}; font-weight: 600;">
                                新密码 (���空保持不变)
                            </label>
                            <input type="password" id="editProfilePassword" placeholder="��空保持当前密码"
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
                
                const newPassword = document.getElementById('editProfilePassword').value;
                const updates = {
                    email: document.getElementById('editProfileEmail').value
                };
                
                if (newPassword && newPassword.length >= 4) {
                    updates.password = newPassword;
                } else if (newPassword && newPassword.length < 4) {
                    showToast('密码至少需要4个字符');
                    return;
                }
                
                await updateRecord(customer, updates);
                modal.remove();
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
        
        initApp();