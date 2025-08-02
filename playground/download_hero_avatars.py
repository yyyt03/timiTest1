import os
import json
import requests

# 路径配置
HERO_JSON = 'herolist.json'
IMG_DIR = os.path.join('miniprogram', 'pages', 'images', 'heroes')
IMG_EXT = '.jpg'
URL_TEMPLATE = 'https://game.gtimg.cn/images/yxzj/img201606/heroimg/{id}/{id}.jpg'

# 读取本地已有图片名（不含扩展名）
local_imgs = set()
for fname in os.listdir(IMG_DIR):
    if fname.endswith(('.jpg', '.png', '.webp')):
        local_imgs.add(os.path.splitext(fname)[0])

# 读取herolist.json
with open(HERO_JSON, 'r', encoding='utf-8') as f:
    heros = json.load(f)

missing = []
for hero in heros:
    hero_id = hero['ename']
    hero_py = hero['id_name']
    img_name = f'{hero_py}{IMG_EXT}'
    img_path = os.path.join(IMG_DIR, img_name)
    if hero_py not in local_imgs:
        url = URL_TEMPLATE.format(id=hero_id)
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200 and resp.content[:4] != b'<!DO':
                with open(img_path, 'wb') as f:
                    for chunk in resp.iter_content(chunk_size=128):
                        f.write(chunk)
                print(f'下载成功: {img_name}')
            else:
                print(f'未找到: {img_name} ({url})')
                missing.append((hero_py, url))
        except Exception as e:
            print(f'下载失败: {img_name} ({url}) 错误: {e}')
            missing.append((hero_py, url))
    else:
        print(f'已存在: {img_name}')

if missing:
    print('\n下载失败或未找到的头像:')
    for name, url in missing:
        print(f'{name}: {url}')
else:
    print('\n全部头像已下载完成！') 