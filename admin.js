// Supabase 설정
const SUPABASE_URL = 'https://wllnzpuvztizggtdiucj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbG56cHV2enRpemdndGRpdWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDEwMTEsImV4cCI6MjA4ODcxNzAxMX0.pYiSOKK31-ZLqf60iZJeXGYiopirptookPOfO56MCuw';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Quill 에디터 초기화
const quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: '상세 내용을 작성하세요...',
    modules: {
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['link', 'image', 'video'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['clean']
            ]
        }
    }
});

const adminForm = document.getElementById('admin-form');
const adminList = document.getElementById('admin-list');
const workTitleInput = document.getElementById('work-title');
const workTypeInput = document.getElementById('work-type');
const workImageInput = document.getElementById('work-image');
const fileNameSpan = document.getElementById('file-name');
const submitBtn = document.getElementById('submit-btn');

let editMode = false;
let editId = null;
let currentThumbnailPath = null;
let currentThumbnailUrl = null;

// 파일 선택 시 이름 표시
workImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameSpan.textContent = `선택된 파일: ${file.name}`;
    }
});

// 작품 목록 렌더링
async function renderAdminWorks() {
    const { data: works, error } = await supabaseClient
        .from('works')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching works:', error);
        return;
    }

    adminList.innerHTML = '';
    works.forEach(work => {
        const item = document.createElement('div');
        item.className = 'admin-item';
        item.innerHTML = `
            <div>
                <strong>${work.title}</strong> - <span style="color:#aaa">${work.type}</span>
            </div>
            <div class="actions">
                <button onclick="editWork(${JSON.stringify(work).replace(/"/g, '&quot;')})" class="btn-save" style="margin-top:0; padding: 10px 20px;">EDIT</button>
                <button onclick="deleteWork(${work.id}, '${work.thumbnail_path}')" class="btn-delete">DELETE</button>
            </div>
        `;
        adminList.appendChild(item);
    });
}

// 수정 모드 진입
window.editWork = (work) => {
    editMode = true;
    editId = work.id;
    currentThumbnailPath = work.thumbnail_path;
    currentThumbnailUrl = work.thumbnail_url;

    workTitleInput.value = work.title;
    workTypeInput.value = work.type;
    quill.root.innerHTML = work.content;
    
    fileNameSpan.textContent = `기존 이미지 유지 중 (변경하려면 새로 업로드)`;
    submitBtn.textContent = 'UPDATE WORK';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 폼 초기화 함수
function resetForm() {
    editMode = false;
    editId = null;
    currentThumbnailPath = null;
    currentThumbnailUrl = null;
    
    adminForm.reset();
    quill.setContents([]);
    fileNameSpan.textContent = '선택된 파일 없음';
    submitBtn.textContent = 'PUBLISH WORK';
}

// 새 작품 추가 또는 수정
adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.textContent = editMode ? 'UPDATING...' : 'PUBLISHING...';
    submitBtn.disabled = true;

    const title = workTitleInput.value;
    const type = workTypeInput.value;
    const content = quill.root.innerHTML;
    const imageFile = workImageInput.files[0];

    try {
        let thumbnailUrl = currentThumbnailUrl;
        let thumbnailPath = currentThumbnailPath;

        // 새 이미지가 업로드된 경우
        if (imageFile) {
            // 기존 이미지가 있다면 삭제
            if (editMode && currentThumbnailPath) {
                await supabaseClient.storage.from('works_media').remove([currentThumbnailPath]);
            }

            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `thumbnails/${fileName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('works_media')
                .upload(filePath, imageFile);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabaseClient.storage
                .from('works_media')
                .getPublicUrl(filePath);

            thumbnailUrl = publicUrlData.publicUrl;
            thumbnailPath = filePath;
        }

        if (editMode) {
            // 데이터 수정
            const { error: dbError } = await supabaseClient
                .from('works')
                .update({
                    title,
                    type,
                    content,
                    thumbnail_url: thumbnailUrl,
                    thumbnail_path: thumbnailPath
                })
                .eq('id', editId);

            if (dbError) throw dbError;
            alert('작품이 수정되었습니다!');
        } else {
            // 데이터 삽입
            if (!imageFile) {
                alert('썸네일 이미지를 선택해주세요!');
                submitBtn.textContent = 'PUBLISH WORK';
                submitBtn.disabled = false;
                return;
            }

            const { error: dbError } = await supabaseClient
                .from('works')
                .insert([{
                    title,
                    type,
                    content,
                    thumbnail_url: thumbnailUrl,
                    thumbnail_path: thumbnailPath
                }]);

            if (dbError) throw dbError;
            alert('작품이 성공적으로 발행되었습니다!');
        }

        resetForm();
        renderAdminWorks();

    } catch (err) {
        console.error('Error:', err);
        alert('처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
        submitBtn.disabled = false;
    }
});

// 작품 삭제
window.deleteWork = async (id, thumbnailPath) => {
    if (confirm('이 작품을 정말로 삭제하시겠습니까?')) {
        try {
            // 1. 이미지 삭제
            if (thumbnailPath) {
                await supabaseClient.storage.from('works_media').remove([thumbnailPath]);
            }

            // 2. DB 삭제
            const { error } = await supabaseClient
                .from('works')
                .delete()
                .eq('id', id);

            if (error) throw error;

            renderAdminWorks();
        } catch (err) {
            console.error('Error:', err);
            alert('삭제 중 오류가 발생했습니다.');
        }
    }
};

// 초기화
renderAdminWorks();
