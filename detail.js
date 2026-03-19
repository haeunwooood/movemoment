// Supabase 설정
const SUPABASE_URL = 'https://wllnzpuvztizggtdiucj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbG56cHV2enRpemdndGRpdWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDEwMTEsImV4cCI6MjA4ODcxNzAxMX0.pYiSOKK31-ZLqf60iZJeXGYiopirptookPOfO56MCuw';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL 파라미터에서 ID 가져오기
const urlParams = new URLSearchParams(window.location.search);
const workId = urlParams.get('id');

const loadingDiv = document.getElementById('detail-loading');
const contentArea = document.getElementById('detail-content-area');
const titleDisplay = document.getElementById('work-title-display');
const typeDisplay = document.getElementById('work-type-display');
const thumbnailDisplay = document.getElementById('work-thumbnail-display');
const richContentDisplay = document.getElementById('work-content-display');

async function fetchWorkDetail() {
    if (!workId) {
        loadingDiv.textContent = '작품 정보를 찾을 수 없습니다.';
        return;
    }

    try {
        const { data: work, error } = await supabaseClient
            .from('works')
            .select('*')
            .eq('id', workId)
            .single();

        if (error || !work) {
            loadingDiv.textContent = '작품을 불러오는 데 실패했습니다.';
            console.error('Error fetching work:', error);
            return;
        }

        // 렌더링
        titleDisplay.textContent = work.title;
        typeDisplay.textContent = work.type;
        thumbnailDisplay.src = work.thumbnail_url;
        thumbnailDisplay.alt = work.title;
        richContentDisplay.innerHTML = work.content; // 에디터에서 작성한 HTML 렌더링

        loadingDiv.style.display = 'none';
        contentArea.style.display = 'block';

        // 페이지 타이틀 변경
        document.title = `${work.title} | MOVEMOMENT`;

    } catch (err) {
        console.error('Fetch error:', err);
        loadingDiv.textContent = '오류가 발생했습니다.';
    }
}

// 초기화
window.addEventListener('DOMContentLoaded', fetchWorkDetail);
