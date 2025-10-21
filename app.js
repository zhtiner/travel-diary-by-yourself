// 旅游日记应用主文件
class TravelDiaryApp {
    constructor() {
        this.photos = [];
        this.map = null;
        this.markers = {};
        this.currentEditingPhoto = null;
        this.selectedPhotos = [];
        
        this.init();
    }

    init() {
        this.loadData();
        this.initMap();
        this.bindEvents();
        this.renderPhotos();
        this.updateLocationFilter();
    }

    // 数据管理
    loadData() {
        const savedPhotos = localStorage.getItem('travelPhotos');
        if (savedPhotos) {
            this.photos = JSON.parse(savedPhotos);
        }
    }

    saveData() {
        localStorage.setItem('travelPhotos', JSON.stringify(this.photos));
    }

    // 地图初始化
    initMap() {
        // 使用OpenStreetMap作为默认地图
        this.map = L.map('map').setView([39.9042, 116.4074], 10); // 默认北京
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        // 添加点击事件来设置照片位置
        this.map.on('click', (e) => {
            if (this.currentEditingPhoto !== null) {
                this.setPhotoLocation(e.latlng);
            }
        });

        this.renderMapMarkers();
    }

    // 事件绑定
    bindEvents() {
        // 文件上传相关
        const fileInput = document.getElementById('fileInput');
        const uploadZone = document.getElementById('uploadZone');
        
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadZone.addEventListener('drop', (e) => this.handleDrop(e));

        // 按钮事件
        document.getElementById('uploadBtn').addEventListener('click', () => fileInput.click());
        document.getElementById('generateBtn').addEventListener('click', () => this.openDiaryModal());
        document.getElementById('shareBtn').addEventListener('click', () => this.openShareModal());

        // 编辑面板事件
        document.getElementById('closePanel').addEventListener('click', () => this.closeEditPanel());
        document.getElementById('savePhoto').addEventListener('click', () => this.savePhoto());
        document.getElementById('deletePhoto').addEventListener('click', () => this.deletePhoto());

        // 搜索和筛选
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterPhotos(e.target.value));
        document.getElementById('locationFilter').addEventListener('change', (e) => this.filterByLocation(e.target.value));

        // 模态框事件
        document.getElementById('closeDiaryModal').addEventListener('click', () => this.closeDiaryModal());
        document.getElementById('closeShareModal').addEventListener('click', () => this.closeShareModal());
        document.getElementById('generateDiary').addEventListener('click', () => this.generateDiary());
        document.getElementById('exportPDF').addEventListener('click', () => this.exportPDF());
        document.getElementById('shareLink').addEventListener('click', () => this.generateShareLink());
        document.getElementById('downloadPDF').addEventListener('click', () => this.downloadPDF());
        document.getElementById('copyLink').addEventListener('click', () => this.copyShareLink());

        // 点击模态框背景关闭
        document.getElementById('diaryModal').addEventListener('click', (e) => {
            if (e.target.id === 'diaryModal') this.closeDiaryModal();
        });
        document.getElementById('shareModal').addEventListener('click', (e) => {
            if (e.target.id === 'shareModal') this.closeShareModal();
        });
    }

    // 文件上传处理
    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        this.processFiles(files);
    }

    handleDragOver(event) {
        event.preventDefault();
        document.getElementById('uploadZone').classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        document.getElementById('uploadZone').classList.remove('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        document.getElementById('uploadZone').classList.remove('dragover');
        
        const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        this.processFiles(files);
    }

    processFiles(files) {
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const photo = {
                    id: Date.now() + Math.random(),
                    image: e.target.result,
                    location: '',
                    description: '',
                    timestamp: new Date().toISOString(),
                    coordinates: null
                };
                
                this.photos.push(photo);
                this.saveData();
                this.renderPhotos();
                this.updateLocationFilter();
                this.openEditPanel(photo);
            };
            reader.readAsDataURL(file);
        });
    }

    // 照片渲染
    renderPhotos() {
        const photosGrid = document.getElementById('photosGrid');
        const uploadZone = document.getElementById('uploadZone');
        
        // 清空现有照片
        photosGrid.innerHTML = '';
        photosGrid.appendChild(uploadZone);

        // 渲染照片
        this.photos.forEach(photo => {
            const photoElement = this.createPhotoElement(photo);
            photosGrid.appendChild(photoElement);
        });
    }

    createPhotoElement(photo) {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'photo-item';
        photoDiv.innerHTML = `
            <img src="${photo.image}" alt="照片">
            <div class="photo-info">
                <h4>${photo.location || '未设置位置'}</h4>
                <p>${photo.description || '暂无描述'}</p>
            </div>
            ${photo.location ? `<div class="photo-location">📍 ${photo.location}</div>` : ''}
        `;
        
        photoDiv.addEventListener('click', () => this.openEditPanel(photo));
        return photoDiv;
    }

    // 编辑面板
    openEditPanel(photo) {
        this.currentEditingPhoto = photo;
        const panel = document.getElementById('editPanel');
        
        document.getElementById('editPhoto').src = photo.image;
        document.getElementById('photoLocation').value = photo.location || '';
        document.getElementById('photoDescription').value = photo.description || '';
        document.getElementById('photoTime').value = new Date(photo.timestamp).toISOString().slice(0, 16);
        
        panel.classList.add('open');
    }

    closeEditPanel() {
        document.getElementById('editPanel').classList.remove('open');
        this.currentEditingPhoto = null;
    }

    savePhoto() {
        if (!this.currentEditingPhoto) return;

        const location = document.getElementById('photoLocation').value;
        const description = document.getElementById('photoDescription').value;
        const time = document.getElementById('photoTime').value;

        this.currentEditingPhoto.location = location;
        this.currentEditingPhoto.description = description;
        this.currentEditingPhoto.timestamp = new Date(time).toISOString();

        this.saveData();
        this.renderPhotos();
        this.renderMapMarkers();
        this.updateLocationFilter();
        this.closeEditPanel();
    }

    deletePhoto() {
        if (!this.currentEditingPhoto) return;

        const index = this.photos.findIndex(p => p.id === this.currentEditingPhoto.id);
        if (index > -1) {
            this.photos.splice(index, 1);
            this.saveData();
            this.renderPhotos();
            this.renderMapMarkers();
            this.updateLocationFilter();
            this.closeEditPanel();
        }
    }

    // 地图标记
    renderMapMarkers() {
        // 清除现有标记
        Object.values(this.markers).forEach(marker => this.map.removeLayer(marker));
        this.markers = {};

        // 添加新标记
        this.photos.forEach(photo => {
            if (photo.coordinates) {
                const marker = L.marker(photo.coordinates).addTo(this.map);
                marker.bindPopup(`
                    <div style="text-align: center;">
                        <img src="${photo.image}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;">
                        <h4>${photo.location}</h4>
                        <p>${photo.description}</p>
                        <small>${new Date(photo.timestamp).toLocaleDateString('zh-CN')}</small>
                    </div>
                `);
                
                marker.on('click', () => {
                    this.openEditPanel(photo);
                });
                
                this.markers[photo.id] = marker;
            }
        });
    }

    setPhotoLocation(latlng) {
        if (!this.currentEditingPhoto) return;

        this.currentEditingPhoto.coordinates = [latlng.lat, latlng.lng];
        
        // 如果没有设置位置名称，使用坐标
        if (!this.currentEditingPhoto.location) {
            this.currentEditingPhoto.location = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
            document.getElementById('photoLocation').value = this.currentEditingPhoto.location;
        }

        this.saveData();
        this.renderMapMarkers();
    }

    // 搜索和筛选
    filterPhotos(searchTerm) {
        const photoItems = document.querySelectorAll('.photo-item');
        const term = searchTerm.toLowerCase();

        photoItems.forEach(item => {
            const location = item.querySelector('h4').textContent.toLowerCase();
            const description = item.querySelector('p').textContent.toLowerCase();
            
            if (location.includes(term) || description.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    filterByLocation(location) {
        const photoItems = document.querySelectorAll('.photo-item');
        
        photoItems.forEach(item => {
            const photoLocation = item.querySelector('h4').textContent;
            
            if (!location || photoLocation === location) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    updateLocationFilter() {
        const filter = document.getElementById('locationFilter');
        const locations = [...new Set(this.photos.map(p => p.location).filter(l => l))];
        
        filter.innerHTML = '<option value="">所有位置</option>';
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            filter.appendChild(option);
        });
    }

    // 日记生成
    openDiaryModal() {
        const modal = document.getElementById('diaryModal');
        this.populatePhotoSelector();
        this.updateDiaryPreview();
        modal.classList.add('show');
    }

    closeDiaryModal() {
        document.getElementById('diaryModal').classList.remove('show');
    }

    populatePhotoSelector() {
        const selector = document.getElementById('photoSelector');
        selector.innerHTML = '';

        this.photos.forEach(photo => {
            const item = document.createElement('div');
            item.className = 'photo-selector-item';
            item.innerHTML = `
                <input type="checkbox" value="${photo.id}">
                <img src="${photo.image}" alt="照片">
                <div>
                    <strong>${photo.location || '未设置位置'}</strong>
                    <p>${photo.description || '暂无描述'}</p>
                    <small>${new Date(photo.timestamp).toLocaleDateString('zh-CN')}</small>
                </div>
            `;
            
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                    item.classList.toggle('selected', checkbox.checked);
                    this.updateSelectedPhotos();
                }
            });
            
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', () => {
                item.classList.toggle('selected', checkbox.checked);
                this.updateSelectedPhotos();
            });
            
            selector.appendChild(item);
        });
    }

    updateSelectedPhotos() {
        const checkboxes = document.querySelectorAll('#photoSelector input[type="checkbox"]:checked');
        this.selectedPhotos = Array.from(checkboxes).map(cb => 
            this.photos.find(p => p.id === cb.value)
        );
        this.updateDiaryPreview();
    }

    updateDiaryPreview() {
        const preview = document.getElementById('diaryPreview');
        const title = document.getElementById('diaryTitle').value || '我的旅游日记';
        
        if (this.selectedPhotos.length === 0) {
            preview.innerHTML = '<p style="text-align: center; color: #718096;">请选择要包含在日记中的照片</p>';
            return;
        }

        let html = `<h2>${title}</h2>`;
        
        this.selectedPhotos.forEach(photo => {
            html += `
                <div class="diary-entry">
                    <h3>📍 ${photo.location || '未知位置'}</h3>
                    <div class="entry-meta">
                        📅 ${new Date(photo.timestamp).toLocaleDateString('zh-CN')} 
                        ${new Date(photo.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}
                    </div>
                    ${photo.description ? `<p>${photo.description}</p>` : ''}
                    <img src="${photo.image}" alt="${photo.location}">
                </div>
            `;
        });

        preview.innerHTML = html;
    }

    generateDiary() {
        this.updateDiaryPreview();
        // 日记已在前端生成，可以进一步处理
        console.log('日记生成完成');
    }

    // PDF导出
    exportPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const title = document.getElementById('diaryTitle').value || '我的旅游日记';
        
        // 添加标题
        doc.setFontSize(20);
        doc.text(title, 105, 20, { align: 'center' });
        
        let yPosition = 40;
        
        this.selectedPhotos.forEach((photo, index) => {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
            
            // 添加位置标题
            doc.setFontSize(14);
            doc.text(`📍 ${photo.location || '未知位置'}`, 20, yPosition);
            yPosition += 10;
            
            // 添加时间
            doc.setFontSize(10);
            doc.text(`📅 ${new Date(photo.timestamp).toLocaleDateString('zh-CN')}`, 20, yPosition);
            yPosition += 10;
            
            // 添加描述
            if (photo.description) {
                doc.setFontSize(12);
                const description = doc.splitTextToSize(photo.description, 170);
                doc.text(description, 20, yPosition);
                yPosition += description.length * 5;
            }
            
            yPosition += 10;
        });
        
        doc.save(`${title}.pdf`);
    }

    downloadPDF() {
        this.exportPDF();
    }

    // 分享功能
    openShareModal() {
        document.getElementById('shareModal').classList.add('show');
    }

    closeShareModal() {
        document.getElementById('shareModal').classList.remove('show');
    }

    generateShareLink() {
        const shareData = {
            title: document.getElementById('diaryTitle').value || '我的旅游日记',
            photos: this.selectedPhotos.map(photo => ({
                image: photo.image,
                location: photo.location,
                description: photo.description,
                timestamp: photo.timestamp
            }))
        };
        
        // 生成分享链接（这里使用base64编码作为演示）
        const encodedData = btoa(JSON.stringify(shareData));
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encodedData}`;
        
        document.getElementById('shareLinkInput').value = shareUrl;
    }

    copyShareLink() {
        const input = document.getElementById('shareLinkInput');
        input.select();
        document.execCommand('copy');
        
        // 显示复制成功提示
        const btn = document.getElementById('copyLink');
        const originalText = btn.textContent;
        btn.textContent = '已复制!';
        btn.style.background = '#48bb78';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }

    // 加载分享数据
    loadSharedData() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareData = urlParams.get('share');
        
        if (shareData) {
            try {
                const data = JSON.parse(atob(shareData));
                document.getElementById('diaryTitle').value = data.title;
                this.selectedPhotos = data.photos;
                this.openDiaryModal();
            } catch (e) {
                console.error('分享数据解析失败:', e);
            }
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new TravelDiaryApp();
    
    // 检查是否有分享数据
    app.loadSharedData();
    
    // 将应用实例暴露到全局，方便调试
    window.travelApp = app;
});
