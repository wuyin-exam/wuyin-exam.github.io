const menuButton = document.querySelector('.menu-button');
const sidebar = document.querySelector('.sidebar');
const backdrop = document.querySelector('.sidebar-backdrop');

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '打开操作目录');
  sidebar.classList.remove('is-open');
  backdrop.hidden = true;
}

menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '关闭操作目录' : '打开操作目录');
  sidebar.classList.toggle('is-open', open);
  backdrop.hidden = !open;
});
backdrop.addEventListener('click', closeMenu);
sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
window.matchMedia('(min-width: 761px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

let activeGallery;

function preloadGallery(gallery, priority = 'auto') {
  if (priority === 'high') {
    activeGallery = gallery;
    document.querySelectorAll('.gallery img').forEach(image => {
      if (!gallery.contains(image)) image.fetchPriority = 'low';
    });
  }
  gallery.querySelectorAll('img').forEach(image => {
    image.fetchPriority = gallery === activeGallery ? 'high' : priority;
    image.loading = 'eager';
  });
}

function loadGuideImage(image) {
  preloadGallery(image.closest('.gallery'), 'high');
}

// Read ahead one image at a time while the visitor reads the current section.
window.addEventListener('load', async () => {
  for (const image of document.querySelectorAll('.gallery img')) {
    if (image.complete && image.naturalWidth > 0) continue;
    if (image.closest('.gallery') !== activeGallery) image.fetchPriority = 'low';
    image.loading = 'eager';
    await image.decode();
  }
}, { once: true });

const galleryObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    preloadGallery(entry.target);
    galleryObserver.unobserve(entry.target);
  });
}, { rootMargin: '600px 0px' });
document.querySelectorAll('.gallery').forEach(gallery => galleryObserver.observe(gallery));

function openGuideTarget(hash) {
  const target = document.getElementById(hash.slice(1));
  if (target?.matches('.faq-list details')) target.open = true;
  const gallery = target?.querySelector('.gallery');
  if (gallery) {
    preloadGallery(gallery, 'high');
    galleryObserver.unobserve(gallery);
  }
}
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => openGuideTarget(link.hash));
});
window.addEventListener('hashchange', () => openGuideTarget(location.hash));
openGuideTarget(location.hash);

const navLinks = [...sidebar.querySelectorAll('.sidebar-home, nav a[href^="#"]')];
const navTargets = navLinks.map(link => document.querySelector(link.hash));
let scrollScheduled = false;

function updateActiveLink() {
  let activeIndex = 0;
  navTargets.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= 115) activeIndex = index;
  });
  const gallery = navTargets[activeIndex]?.querySelector('.gallery');
  if (gallery && gallery !== activeGallery) {
    preloadGallery(gallery, 'high');
    galleryObserver.unobserve(gallery);
  }
  navLinks.forEach((link, index) => {
    link.classList.toggle('active', index === activeIndex);
    if (index === activeIndex) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollScheduled = false;
}

window.addEventListener('scroll', () => {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(updateActiveLink);
}, { passive: true });
window.addEventListener('hashchange', () => requestAnimationFrame(updateActiveLink));
window.addEventListener('resize', () => requestAnimationFrame(updateActiveLink));
window.addEventListener('load', updateActiveLink);
updateActiveLink();

document.querySelectorAll('.multi-image').forEach(gallery => {
  const track = gallery.querySelector('.gallery-track');
  const slides = [...track.children];
  const previous = gallery.querySelector('.gallery-prev');
  const next = gallery.querySelector('.gallery-next');
  const status = gallery.querySelector('.gallery-status');

  function currentIndex() {
    return Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
  }

  function showImage(index) {
    const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
    loadGuideImage(slides[nextIndex].querySelector('img'));
    if (track.contains(document.activeElement) && document.activeElement !== track) track.focus({ preventScroll: true });
    track.scrollTo({ left: nextIndex * track.clientWidth });
  }

  function updateGallery() {
    const index = currentIndex();
    const currentButton = slides[index].querySelector('.image-button');
    if (track.contains(document.activeElement) && document.activeElement !== track && document.activeElement !== currentButton) {
      track.focus({ preventScroll: true });
    }
    previous.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    const count = `${index + 1} / ${slides.length}`;
    if (status.textContent !== count) status.textContent = count;
    slides.forEach((slide, slideIndex) => {
      slide.querySelector('.image-button').tabIndex = slideIndex === index ? 0 : -1;
    });
  }

  previous.addEventListener('click', () => showImage(currentIndex() - 1));
  next.addEventListener('click', () => showImage(currentIndex() + 1));
  track.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = currentIndex();
    if (event.key === 'ArrowLeft' && index > 0) showImage(index - 1);
    if (event.key === 'ArrowRight' && index < slides.length - 1) showImage(index + 1);
    if (event.key === 'Home') showImage(0);
    if (event.key === 'End') showImage(slides.length - 1);
  });
  track.addEventListener('scroll', () => {
    loadGuideImage(slides[currentIndex()].querySelector('img'));
    updateGallery();
  }, { passive: true });
  new ResizeObserver(updateGallery).observe(track);
  updateGallery();
});

const imageDialog = document.querySelector('.image-dialog');
const enlargedImage = document.querySelector('#enlarged-image');
const imageCaption = document.querySelector('#image-caption');
const originalImage = document.querySelector('#original-image');
const imageSizeToggle = document.querySelector('.image-size-toggle');
const dialogImageWrap = document.querySelector('.dialog-image-wrap');

function setOriginalSize(originalSize) {
  imageDialog.classList.toggle('is-original-size', originalSize);
  imageSizeToggle.textContent = originalSize ? '适合窗口' : '原始尺寸';
  dialogImageWrap.scrollTo(0, 0);
}

imageSizeToggle.addEventListener('click', () => {
  setOriginalSize(!imageDialog.classList.contains('is-original-size'));
});

document.querySelectorAll('.image-button').forEach(button => {
  button.addEventListener('click', () => {
    const image = button.querySelector('img');
    loadGuideImage(image);
    enlargedImage.src = image.dataset.zoom;
    enlargedImage.alt = image.alt;
    imageCaption.textContent = image.alt;
    originalImage.href = button.dataset.original;
    setOriginalSize(false);
    document.body.classList.add('modal-open');
    imageDialog.showModal();
  });
});
document.querySelector('.close-dialog').addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('click', event => {
  if (event.target !== imageDialog) return;
  const rect = imageDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) imageDialog.close();
});
imageDialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
