// Supabase 설정
const SUPABASE_URL = 'https://wllnzpuvztizggtdiucj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbG56cHV2enRpemdndGRpdWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDEwMTEsImV4cCI6MjA4ODcxNzAxMX0.pYiSOKK31-ZLqf60iZJeXGYiopirptookPOfO56MCuw';
const supabaseClient = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Works 데이터 렌더링
const worksContainer = document.getElementById('works-container');

// 기본 작품 데이터 (Supabase 데이터가 없을 때 표시할 것들)
const defaultWorks = [
    { id: 1, title: 'KITSCH POP', type: '3D OBJECT 01', thumbnail_url: '' },
    { id: 2, title: 'NEON SPACE', type: '3D OBJECT 02', thumbnail_url: '' },
    { id: 3, title: 'Project A', type: '3D OBJECT 03', thumbnail_url: '' }
];

// 작품 렌더링 함수
async function renderWorks() {
    const container = document.getElementById('works-container');
    if (!container) return;

    let works = defaultWorks;

    if (typeof supabase !== 'undefined') {
        try {
            const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            const { data, error } = await client
                .from('works')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                works = data;
            }
        } catch (err) {
            console.warn('Supabase fetch error, using defaults');
        }
    }
    
    container.innerHTML = ''; 

    works.forEach(work => {
        const workItem = document.createElement('div');
        workItem.className = 'work-item';
        workItem.onclick = () => {
            if (work.id) location.href = `detail.html?id=${work.id}`;
        };
        
        const imgContent = work.thumbnail_url 
            ? `<img src="${work.thumbnail_url}" style="width:100%; height:100%; object-fit:cover; border-radius:20px;">`
            : `<div class="work-img placeholder">${work.type}</div>`;

        workItem.innerHTML = `
            ${work.thumbnail_url ? `<div class="work-img">${imgContent}</div>` : imgContent}
            <h3>${work.title}</h3>
        `;
        container.appendChild(workItem);
    });

    // ScrollTrigger 리프레시 및 애니메이션 재설정
    ScrollTrigger.refresh();
    
    gsap.from(container.querySelectorAll('.work-item'), {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        scrollTrigger: {
            trigger: "#works",
            start: "top 80%",
            toggleActions: "play none none reverse"
        }
    });
}

// 초기 렌더링
window.addEventListener('DOMContentLoaded', renderWorks);

// GSAP 스크롤 애니메이션
gsap.registerPlugin(ScrollTrigger);

// 각 섹션 등장 애니메이션 (Works를 제외한 나머지)
gsap.utils.toArray('.panel').forEach(panel => {
    // Works 섹션은 renderWorks에서 별도로 처리하거나, 여기를 유지
    if (panel.id !== 'works') {
        gsap.from(panel.querySelectorAll('h2, .about-content, .btn, .marketing-num'), {
            y: 100,
            opacity: 0,
            duration: 1,
            stagger: 0.2,
            scrollTrigger: {
                trigger: panel,
                start: "top 85%",
                toggleActions: "play none none reverse"
            }
        });
    }
});

// Three.js 배경 인터렉션 (키치한 3D 와이어프레임 오브젝트)
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 오브젝트 형태들 (도넛, 이코사헤드론, 원뿔)
const geometry1 = new THREE.TorusKnotGeometry(4, 1.5, 100, 16);
const geometry2 = new THREE.IcosahedronGeometry(5, 0);
const geometry3 = new THREE.ConeGeometry(4, 10, 32);

// 메인 컬러인 네온 그린(#39FF14) 매테리얼 (와이어프레임으로 힙한 느낌)
const material = new THREE.MeshPhysicalMaterial({
    color: 0x39FF14,
    metalness: 0.3,
    roughness: 0.4,
    wireframe: true,
    emissive: 0x114400,
    emissiveIntensity: 0.8
});

const shape1 = new THREE.Mesh(geometry1, material);
const shape2 = new THREE.Mesh(geometry2, material);
const shape3 = new THREE.Mesh(geometry3, material);

shape1.position.set(-15, 10, -10);
shape2.position.set(20, -5, -20);
shape3.position.set(-10, -15, -15);

scene.add(shape1, shape2, shape3);

// 빛 설정
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x39FF14, 2);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// 문의 폼 제출 처리
const inquiryForm = document.getElementById('inquiry-form');
const inquiryBtn = document.getElementById('inquiry-btn');

if (inquiryForm) {
    inquiryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('inquiry-name').value;
        const email = document.getElementById('inquiry-email').value;
        const subject = document.getElementById('inquiry-subject').value;
        const message = document.getElementById('inquiry-message').value;

        inquiryBtn.textContent = 'SENDING...';
        inquiryBtn.disabled = true;

        try {
            // supabaseClient를 직접 사용하는 대신, 필요한 곳에서 다시 초기화하여 안전하게 사용
            const client = (typeof supabase !== 'undefined') ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
            
            if (!client) {
                throw new Error('Supabase client is not initialized');
            }

            const { error } = await client
                .from('inquiries')
                .insert([{ 
                    name, 
                    email, 
                    subject, 
                    message
                }]);

            if (error) throw error;

            alert('문의가 성공적으로 전달되었습니다! 곧 연락드리겠습니다.');
            inquiryForm.reset();
        } catch (err) {
            console.error('Inquiry submission error:', err);
            alert('문의 전송 중 오류가 발생했습니다. (DB 테이블 "inquiries" 생성 여부를 확인해주세요.)');
        } finally {
            inquiryBtn.textContent = 'SEND MESSAGE';
            inquiryBtn.disabled = false;
        }
    });
}
let mouseY = 0;
let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
});

// 애니메이션 루프
const clock = new THREE.Clock();

function animate() {
    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    const elapsedTime = clock.getElapsedTime();

    // 오브젝트들 자체 회전
    shape1.rotation.x += 0.005;
    shape1.rotation.y += 0.01;
    
    shape2.rotation.x -= 0.005;
    shape2.rotation.y += 0.008;
    
    shape3.rotation.x += 0.01;
    shape3.rotation.z -= 0.005;

    // 둥둥 떠다니는 플로팅 효과
    shape1.position.y += Math.sin(elapsedTime) * 0.02;
    shape2.position.y += Math.cos(elapsedTime) * 0.02;
    shape3.position.y += Math.sin(elapsedTime + 2) * 0.02;

    // 마우스 이동 시 전체 화면이 미세하게 기울어지는 인터렉션
    scene.rotation.y += 0.05 * (targetX - scene.rotation.y);
    scene.rotation.x += 0.05 * (targetY - scene.rotation.x);

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// 창 크기 조절 대응
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});