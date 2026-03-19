// Supabase 설정
const SUPABASE_URL = 'https://wllnzpuvztizggtdiucj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbG56cHV2enRpemdndGRpdWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDEwMTEsImV4cCI6MjA4ODcxNzAxMX0.pYiSOKK31-ZLqf60iZJeXGYiopirptookPOfO56MCuw';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Quill 에디터 초기화
const quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            ['image', 'link'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            ['clean']
        ]
    }
});

const adminForm = document.getElementById('admin-form');
const adminList = document.getElementById('admin-list');
const workTitleInput = document.getElementById('work-title');
const workTypeInput = document.getElementById('work-type');
const workImageInput = document.getElementById('work-image');
const fileNameSpan = document.getElementById('file-name');
const submitBtn = document.getElementById('submit-btn');

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
                <button onclick="deleteWork(${work.id}, '${work.thumbnail_path}')" class="btn-delete">DELETE</button>
            </div>
        `;
        adminList.appendChild(item);
    });
}

// 새 작품 추가
adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.textContent = 'PUBLISHING...';
    submitBtn.disabled = true;

    const title = workTitleInput.value;
    const type = workTypeInput.value;
    const content = quill.root.innerHTML;
    const imageFile = workImageInput.files[0];

    if (!imageFile) {
        alert('썸네일 이미지를 선택해주세요!');
        submitBtn.textContent = 'PUBLISH WORK';
        submitBtn.disabled = false;
        return;
    }

    try {
        // 1. 이미지 업로드 (Supabase Storage)
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `thumbnails/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
            .from('works_media')
            .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // 2. 공개 URL 가져오기
        const { data: publicUrlData } = supabaseClient.storage
            .from('works_media')
            .getPublicUrl(filePath);

        const thumbnailUrl = publicUrlData.publicUrl;

        // 3. Database에 저장
        const { error: dbError } = await supabaseClient
            .from('works')
            .insert([{
                title,
                type,
                content,
                thumbnail_url: thumbnailUrl,
                thumbnail_path: filePath
            }]);

        if (dbError) throw dbError;

        alert('작품이 성공적으로 발행되었습니다!');
        adminForm.reset();
        quill.setContents([]);
        fileNameSpan.textContent = '선택된 파일 없음';
        renderAdminWorks();

    } catch (err) {
        console.error('Error:', err);
        alert('발행 중 오류가 발생했습니다: ' + err.message);
    } finally {
        submitBtn.textContent = 'PUBLISH WORK';
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
