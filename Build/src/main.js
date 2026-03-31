// Set default date to now (ISO format with timezone offset)
const dateInput = document.getElementById('date');
const now = new Date();
const offset = -now.getTimezoneOffset();
const sign = offset >= 0 ? '+' : '-';
const pad = (n) => String(Math.abs(n)).padStart(2, '0');
dateInput.value = `${now.toISOString().slice(0, -1)}${sign}${pad(offset / 60)}:${pad(offset % 60)}`;

// Auto-generate slug from title
document.getElementById('title').addEventListener('input', (e) => {
    const slug = e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    document.getElementById('slug').value = slug;
});

// Tab switching for image input
document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
});

// Image preview
document.getElementById('coverImageFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('imagePreview').src = e.target.result;
            document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Preview function
function generatePreview() {
    const basePath = document.getElementById('basePath').value;
    const imagesPath = document.getElementById('imagesPath').value;
    const title = document.getElementById('title').value;
    const slug = document.getElementById('slug').value;
    const date = document.getElementById('date').value;
    const updated = document.getElementById('updated').value;
    const hidden = document.getElementById('hidden').value;
    const tags = document.getElementById('tags').value;
    const keywords = document.getElementById('keywords').value;
    const excerpt = document.getElementById('excerpt').value;
    const content = document.getElementById('content').value;

    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    let coverImage = '';
    let imagePath = '';
    if (activeTab === 'url') {
        coverImage = document.getElementById('coverImageUrl').value;
    } else {
        const fileInput = document.getElementById('coverImageFile');
        if (fileInput.files[0]) {
            const ext = fileInput.files[0].name.split('.').pop();
            imagePath = `${imagesPath}${slug}.${ext}`;
            coverImage = imagesPath.replace('static/', '/') + `${slug}.${ext}`;
        }
    }

    const filePath = `${basePath}${slug}/+page.md`;
    document.getElementById('filePathDisplay').textContent = filePath;
    document.getElementById('imagePathDisplay').textContent = imagePath || '(none)';
    document.getElementById('pathInfo').style.display = 'block';

    const tagsArray = tags
        ? tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
    const keywordsArray = keywords
        ? keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean)
        : [];

    let frontmatter = `---
title: "${title}"
slug: "${slug}"`;

    if (coverImage)
        frontmatter += `
coverImage: "${coverImage}"`;
    if (excerpt)
        frontmatter += `
excerpt: "${excerpt}"`;
    frontmatter += `
date: "${date}"`;

    if (updated)
        frontmatter += `
updated: "${updated}"`;

    frontmatter += `
hidden: ${hidden}`;

    if (tagsArray.length)
        frontmatter += `
tags:
${tagsArray.map((t) => `  - ${t}`).join('\n')}`;

    if (keywordsArray.length)
        frontmatter += `
keywords:
${keywordsArray.map((k) => `  - ${k}`).join('\n')}`;

    frontmatter += `\n---`;

    return frontmatter + '\n\n' + content;
}

document.getElementById('previewBtn').addEventListener('click', () => {
    const preview = generatePreview();
    document.getElementById('previewContent').textContent = preview;
    document.getElementById('previewContent').classList.add('visible');
});

// Auto-update preview on field changes
[
    'title',
    'slug',
    'date',
    'updated',
    'hidden',
    'tags',
    'keywords',
    'excerpt',
    'content',
    'coverImageUrl'
].forEach((id) => {
    const el = document.getElementById(id);
    if (el)
        el.addEventListener('input', () => {
            if (document.getElementById('previewContent').classList.contains('visible')) {
                document.getElementById('previewContent').textContent = generatePreview();
            }
        });
});

// Also update preview when file is selected
document.getElementById('coverImageFile').addEventListener('change', () => {
    if (document.getElementById('previewContent').classList.contains('visible')) {
        document.getElementById('previewContent').textContent = generatePreview();
    }
});

// Helper: encode base64
function btoaUTF8(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

// Upload image to GitHub
async function uploadImage(token, repo, path, content, message) {
    const [owner, name] = repo.split('/');
    const encodedContent = btoaUTF8(content);

    let sha = '';
    try {
        const checkRes = await fetch(
            `https://api.github.com/repos/${owner}/${name}/contents/${path}`,
            {
                headers: { Authorization: `token ${token}` }
            }
        );
        if (checkRes.ok) {
            const checkData = await checkRes.json();
            sha = checkData.sha;
        }
    } catch (e) { }

    const res = await fetch(`https://api.github.com/repos/${owner}/${name}/contents/${path}`, {
        method: 'PUT',
        headers: {
            Authorization: `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message,
            content: encodedContent,
            sha
        })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
    }
    return res.json();
}

document.getElementById('submit').addEventListener('click', async () => {
    const token = document.getElementById('token').value;
    const repo = document.getElementById('repo').value;
    const basePath = document.getElementById('basePath').value;
    const imagesPath = document.getElementById('imagesPath').value;
    const title = document.getElementById('title').value;
    const slug = document.getElementById('slug').value;
    const date = document.getElementById('date').value;
    const updated = document.getElementById('updated').value;
    const hidden = document.getElementById('hidden').value;
    const tags = document.getElementById('tags').value;
    const keywords = document.getElementById('keywords').value;
    const excerpt = document.getElementById('excerpt').value;
    const content = document.getElementById('content').value;
    const message = document.getElementById('message');
    const btn = document.getElementById('submit');

    // Get cover image value
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    let coverImage = '';
    if (activeTab === 'url') {
        coverImage = document.getElementById('coverImageUrl').value;
    } else {
        const fileInput = document.getElementById('coverImageFile');
        if (fileInput.files[0]) {
            btn.disabled = true;
            message.innerHTML = '<div class="success">Uploading image...</div>';

            const reader = new FileReader();
            const fileData = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(fileInput.files[0]);
            });

            const ext = fileInput.files[0].name.split('.').pop();
            const imagePath = `${imagesPath}${slug}.${ext}`;
            const publicPath = imagesPath.replace('static/', '/');

            try {
                await uploadImage(
                    token,
                    repo,
                    imagePath,
                    atob(fileData),
                    `Add cover image for ${title}`
                );
                coverImage = publicPath + `${slug}.${ext}`;
            } catch (e) {
                message.innerHTML = `<div class="error">Image upload failed: ${e.message}</div>`;
                btn.disabled = false;
                return;
            }
        }
    }

    if (!token || !repo || !title || !slug || !content) {
        message.innerHTML =
            '<div class="error">Please fill in all required fields (Title, Slug, Content)</div>';
        return;
    }

    btn.disabled = true;
    message.innerHTML = '<div class="success">Creating post...</div>';

    const [owner, name] = repo.split('/');

    // Build frontmatter
    const tagsArray = tags
        ? tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
    const keywordsArray = keywords
        ? keywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean)
        : [];

    let frontmatter = `---
title: "${title}"
slug: "${slug}"`;

    if (coverImage)
        frontmatter += `
coverImage: "${coverImage}"`;
    if (excerpt)
        frontmatter += `
excerpt: "${excerpt}"`;
    frontmatter += `
date: "${date}"`;

    if (updated)
        frontmatter += `
updated: "${updated}"`;

    frontmatter += `
hidden: ${hidden}`;

    if (tagsArray.length)
        frontmatter += `
tags:
${tagsArray.map((t) => `  - ${t}`).join('\n')}`;

    if (keywordsArray.length)
        frontmatter += `
keywords:
${keywordsArray.map((k) => `  - ${k}`).join('\n')}`;

    frontmatter += `\n---`;

    const fullContent = frontmatter + '\n\n' + content;
    const filePath = `${basePath}${slug}/+page.md`;

    try {
        // Check if file exists
        let sha = '';
        try {
            const checkRes = await fetch(
                `https://api.github.com/repos/${owner}/${name}/contents/${filePath}`,
                {
                    headers: { Authorization: `token ${token}` }
                }
            );
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                sha = checkData.sha;
            }
        } catch (e) { }

        const createRes = await fetch(
            `https://api.github.com/repos/${owner}/${name}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: sha ? `Update post: ${title}` : `Create post: ${title}`,
                    content: btoaUTF8(fullContent),
                    sha
                })
            }
        );

        if (createRes.ok) {
            message.innerHTML = `<div class="success">Post created successfully! File: ${filePath}</div>`;
        } else {
            const err = await createRes.json();
            message.innerHTML = `<div class="error">Error: ${err.message || createRes.status}</div>`;
        }
    } catch (e) {
        message.innerHTML = `<div class="error">Error: ${e.message}</div>`;
    }

    btn.disabled = false;
});