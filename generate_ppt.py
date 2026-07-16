#!/usr/bin/env python3
"""
生成"近三年女性盆底功能障碍性疾病非手术治疗效果研究"专业培训研讨会PPT
使用纯Python标准库（无需python-pptx）
"""

import zipfile
import os
import shutil
from xml.etree.ElementTree import Element, SubElement, tostring, register_namespace
import copy

# ============================================================
# PPTX 结构: PPTX = ZIP 文件，内含 XML 文件
# ============================================================

PPT_DIR = "近三年女性盆底功能障碍性疾病_非手术治疗效果研究.pptx"

# 幻灯片尺寸 (16:9宽屏)
SLIDE_W = 12192000  # EMU
SLIDE_H = 6858000   # EMU

# 命名空间
NSMAP = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
}

# 注册命名空间
for prefix, uri in NSMAP.items():
    register_namespace(prefix, uri)

A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
P = 'http://schemas.openxmlformats.org/presentationml/2006/main'

def elem(tag, parent=None, attrib=None, text=None):
    """创建元素"""
    e = Element(tag, attrib=attrib if attrib else {})
    if text is not None:
        e.text = str(text)
    if parent is not None:
        parent.append(e)
    return e

def sub_elem(parent, tag, attrib=None, text=None):
    return elem(tag, parent, attrib, text)

def a_attrib(k, v):
    """a命名空间属性"""
    return '{%s}%s' % (A, k) if ':' not in k else None

# 颜色方案
COLOR_PRIMARY = "1F4E79"    # 深蓝
COLOR_ACCENT = "2E75B6"     # 中蓝
COLOR_LIGHT = "D6E4F0"      # 浅蓝
COLOR_WHITE = "FFFFFF"
COLOR_BLACK = "333333"
COLOR_GRAY = "666666"
COLOR_GOLD = "C5A33F"

class PPTXBuilder:
    def __init__(self):
        self.slides = []
        self.slide_count = 0
        self.slide_rels = []
        self.image_count = 0

    def build(self, filename):
        """生成PPTX文件"""
        if os.path.exists(filename):
            os.remove(filename)

        with zipfile.ZipFile(filename, 'w', zipfile.ZIP_DEFLATED) as zf:
            # [Content_Types].xml
            zf.writestr('[Content_Types].xml', self._content_types())
            # _rels/.rels
            zf.writestr('_rels/.rels', self._rels())
            # ppt/presentation.xml
            zf.writestr('ppt/presentation.xml', self._presentation())
            # ppt/_rels/presentation.xml.rels
            zf.writestr('ppt/_rels/presentation.xml.rels', self._presentation_rels())
            # ppt/slideMasters/slideMaster1.xml
            zf.writestr('ppt/slideMasters/slideMaster1.xml', self._slide_master())
            # ppt/slideMasters/_rels/slideMaster1.xml.rels
            zf.writestr('ppt/slideMasters/_rels/slideMaster1.xml.rels', self._slide_master_rels())
            # ppt/slideLayouts/slideLayout1.xml
            zf.writestr('ppt/slideLayouts/slideLayout1.xml', self._slide_layout())
            # ppt/slideLayouts/_rels/slideLayout1.xml.rels
            zf.writestr('ppt/slideLayouts/_rels/slideLayout1.xml.rels', self._slide_layout_rels())
            # ppt/theme/theme1.xml
            zf.writestr('ppt/theme/theme1.xml', self._theme())
            # slides
            for i, (slide_xml, slide_rel) in enumerate(self.slides):
                zf.writestr(f'ppt/slides/slide{i+1}.xml', slide_xml)
                zf.writestr(f'ppt/slides/_rels/slide{i+1}.xml.rels', slide_rel)
            # ppt/presProps.xml
            zf.writestr('ppt/presProps.xml', self._pres_props())
            # ppt/viewProps.xml
            zf.writestr('ppt/viewProps.xml', self._view_props())
            # ppt/tableStyles.xml
            zf.writestr('ppt/tableStyles.xml', self._table_styles())

    def add_slide(self, slide_builder):
        """添加幻灯片"""
        self.slide_count += 1
        self.slides.append((slide_builder.xml(), slide_builder.rels()))

    def _content_types(self):
        ct = Element('{http://schemas.openxmlformats.org/package/2006/content-types}Types')
        ct.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/content-types')

        defaults = [
            ('xml', 'application/xml'),
            ('rels', 'application/vnd.openxmlformats-package.relationships+xml'),
        ]
        for ext, ct_str in defaults:
            e = Element('{http://schemas.openxmlformats.org/package/2006/content-types}Default')
            e.set('Extension', ext)
            e.set('ContentType', ct_str)
            ct.append(e)

        overrides = [
            ('/ppt/presentation.xml', 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'),
            ('/ppt/slideMasters/slideMaster1.xml', 'application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml'),
            ('/ppt/slideLayouts/slideLayout1.xml', 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml'),
            ('/ppt/theme/theme1.xml', 'application/vnd.openxmlformats-officedocument.theme+xml'),
            ('/ppt/presProps.xml', 'application/vnd.openxmlformats-officedocument.presentationml.presProps+xml'),
            ('/ppt/viewProps.xml', 'application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml'),
            ('/ppt/tableStyles.xml', 'application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml'),
        ]
        for path, ct_str in overrides:
            e = Element('{http://schemas.openxmlformats.org/package/2006/content-types}Override')
            e.set('PartName', path)
            e.set('ContentType', ct_str)
            ct.append(e)

        for i in range(self.slide_count):
            e = Element('{http://schemas.openxmlformats.org/package/2006/content-types}Override')
            e.set('PartName', f'/ppt/slides/slide{i+1}.xml')
            e.set('ContentType', 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml')
            ct.append(e)

        return self._xml_str(ct)

    def _rels(self):
        rels = Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationships')
        rels.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships')
        e = Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
        e.set('Id', 'rId1')
        e.set('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument')
        e.set('Target', 'ppt/presentation.xml')
        rels.append(e)
        return self._xml_str(rels)

    def _presentation(self):
        pre = Element('{%s}presentation' % P)
        pre.set('xmlns:a', A)
        pre.set('xmlns:r', R)

        elem('{%s}sldMasterIdLst' % P, pre).append(
            elem('{%s}sldMasterId' % P, attrib={'id': '2147483648', '{%s}id' % R: 'rId1'})
        )
        elem('{%s}sldIdLst' % P, pre)
        # 默认幻灯片尺寸
        sz = elem('{%s}sldSz' % P, pre, {'cx': str(SLIDE_W), 'cy': str(SLIDE_H), 'type': 'screen16x9'})
        elem('{%s}notesSz' % P, pre, {'cx': '6858000', 'cy': '9144000'})

        # 更新幻灯片列表
        sld_id_lst = pre.find('{%s}sldIdLst' % P)
        for i in range(self.slide_count):
            e = Element('{%s}sldId' % P)
            e.set('id', str(256 + i))
            e.set('{%s}id' % R, f'rId{i+2}')  # rId1 is slideMaster, rId2+ are slides
            sld_id_lst.append(e)

        return self._xml_str(pre)

    def _presentation_rels(self):
        rels = Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationships')
        rels.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships')

        rel_items = [
            ('rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster', 'slideMasters/slideMaster1.xml'),
        ]
        for i in range(self.slide_count):
            rel_items.append(
                (f'rId{i+2}', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide', f'slides/slide{i+1}.xml')
            )
        rel_items += [
            ('rId100', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps', 'presProps.xml'),
            ('rId101', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps', 'viewProps.xml'),
            ('rId102', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme', 'theme/theme1.xml'),
            ('rId103', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles', 'tableStyles.xml'),
        ]
        for rid, rtype, target in rel_items:
            e = Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
            e.set('Id', rid)
            e.set('Type', rtype)
            e.set('Target', target)
            rels.append(e)

        return self._xml_str(rels)

    def _slide_master(self):
        sm = Element('{%s}sldMaster' % P)
        sm.set('xmlns:a', A)
        sm.set('xmlns:r', R)

        clr_map = elem('{%s}cSld' % P, sm)
        bg = elem('{%s}bg' % P, clr_map)
        bg_ref = elem('{%s}bgRef' % P, bg, {'idx': '1001'})
        elem('{%s}srgbClr' % A, bg_ref, {'val': COLOR_WHITE})

        sp_tree = elem('{%s}spTree' % P, clr_map)
        # 母版形状组
        elem('{%s}sp' % P, sp_tree)

        # 幻灯片布局ID列表
        layout_id_lst = elem('{%s}sldLayoutIdLst' % P, sm)
        e = Element('{%s}sldLayoutId' % P)
        e.set('id', '2147483649')
        e.set('{%s}id' % R, 'rId1')
        layout_id_lst.append(e)

        return self._xml_str(sm)

    def _slide_master_rels(self):
        return self._build_rels([('rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout', '../slideLayouts/slideLayout1.xml')])

    def _slide_layout(self):
        sl = Element('{%s}sldLayout' % P)
        sl.set('xmlns:a', A)
        sl.set('xmlns:r', R)
        sl.set('type', 'blank')

        cSld = elem('{%s}cSld' % P, sl)
        sp_tree = elem('{%s}spTree' % P, cSld)
        elem('{%s}sp' % P, sp_tree)

        return self._xml_str(sl)

    def _slide_layout_rels(self):
        return self._build_rels([('rId1', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster', '../slideMasters/slideMaster1.xml')])

    def _theme(self):
        thm = Element('{%s}theme' % A)
        thm.set('xmlns:a', A)
        thm.set('name', 'Professional Theme')
        # 极简主题
        elem('{%s}themeElements' % A, thm)
        return self._xml_str(thm)

    def _pres_props(self):
        return '<p:presentationPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>'

    def _view_props(self):
        return '<p:viewPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>'

    def _table_styles(self):
        return '<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>'

    def _build_rels(self, items):
        rels = Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationships')
        rels.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships')
        for rid, rtype, target in items:
            e = Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
            e.set('Id', rid)
            e.set('Type', rtype)
            e.set('Target', target)
            rels.append(e)
        return self._xml_str(rels)

    def _xml_str(self, el):
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + tostring(el, encoding='unicode')

# ============================================================
# 幻灯片构建器
# ============================================================

def EMU(cm):
    return int(cm * 360000)

class SlideBuilder:
    """构建单张幻灯片"""

    def __init__(self):
        self.shapes = []
        self._rel_items = []
        self._rel_count = 0

    def xml(self):
        slide = Element('{%s}sld' % P)
        slide.set('xmlns:a', A)
        slide.set('xmlns:r', R)

        cSld = elem('{%s}cSld' % P, slide)
        sp_tree = elem('{%s}spTree' % P, cSld)

        # 默认白色背景
        bg_elem = elem('{%s}bg' % P, cSld)
        bg_fill = elem('{%s}bgPr' % P, bg_elem)
        solid_fill = elem('{%s}solidFill' % A, bg_fill)
        elem('{%s}srgbClr' % A, solid_fill, {'val': COLOR_WHITE})

        # 添加所有形状
        for shape_xml in self.shapes:
            sp_tree.append(shape_xml)

        return self._xml_str(slide)

    def rels(self):
        return self._build_rels(self._rel_items)

    def add_shape(self, shape_el):
        self.shapes.append(shape_el)

    def add_text_box(self, left_cm, top_cm, width_cm, height_cm, paragraphs, shape_name=""):
        """添加文本框

        paragraphs: [{'text': str, 'size': int, 'bold': bool, 'color': str, 'align': str, 'font': str}, ...]
        """
        sp = Element('{%s}sp' % P)
        if shape_name:
            nvSpPr = elem('{%s}nvSpPr' % P, sp)
            cNvPr = elem('{%s}cNvPr' % P, nvSpPr, {'id': '0', 'name': shape_name})
            cNvSpPr = elem('{%s}cNvSpPr' % P, nvSpPr)
            nvPr = elem('{%s}nvPr' % P, nvSpPr)

        spPr = elem('{%s}spPr' % P, sp)
        xfrm = elem('{%s}xfrm' % A, spPr)
        elem('{%s}off' % A, xfrm, {'x': str(EMU(left_cm)), 'y': str(EMU(top_cm))})
        elem('{%s}ext' % A, xfrm, {'cx': str(EMU(width_cm)), 'cy': str(EMU(height_cm))})
        elem('{%s}prstGeom' % A, spPr, {'prst': 'rect'})
        elem('{%s}noFill' % A, spPr)

        txBody = elem('{%s}txBody' % P, sp)
        bodyPr = elem('{%s}bodyPr' % A, txBody, {'wrap': 'square'})

        for i, para in enumerate(paragraphs):
            is_last = (i == len(paragraphs) - 1)
            p_elem = elem('{%s}p' % A, txBody)

            if 'align' in para:
                elem('{%s}pPr' % A, p_elem, {'algn': para['align']})
            else:
                elem('{%s}pPr' % A, p_elem)

            r_elem = elem('{%s}r' % A, p_elem)
            rPr = elem('{%s}rPr' % A, r_elem, {
                'sz': str(para.get('size', 1600)),  # 默认16pt
                'b': '1' if para.get('bold') else '0',
            })

            color = para.get('color', COLOR_BLACK)
            solidFill = elem('{%s}solidFill' % A, rPr)
            elem('{%s}srgbClr' % A, solidFill, {'val': color})

            if 'font' in para:
                latin = elem('{%s}latin' % A, rPr, {'typeface': para['font']})
                ea = elem('{%s}ea' % A, rPr, {'typeface': para['font']})

            elem('{%s}t' % A, r_elem, text=para.get('text', ''))

            if not is_last:
                elem('{%s}endParaRPr' % A, p_elem, {'lang': 'zh-CN'})

        return sp

    def add_filled_rect(self, left_cm, top_cm, width_cm, height_cm, color):
        """添加填充矩形"""
        sp = Element('{%s}sp' % P)

        nvSpPr = elem('{%s}nvSpPr' % P, sp)
        elem('{%s}cNvPr' % P, nvSpPr, {'id': '0', 'name': 'rect'})
        elem('{%s}cNvSpPr' % P, nvSpPr)
        elem('{%s}nvPr' % P, nvSpPr)

        spPr = elem('{%s}spPr' % P, sp)
        xfrm = elem('{%s}xfrm' % A, spPr)
        elem('{%s}off' % A, xfrm, {'x': str(EMU(left_cm)), 'y': str(EMU(top_cm))})
        elem('{%s}ext' % A, xfrm, {'cx': str(EMU(width_cm)), 'cy': str(EMU(height_cm))})
        elem('{%s}prstGeom' % A, spPr, {'prst': 'rect'})

        solidFill = elem('{%s}solidFill' % A, spPr)
        elem('{%s}srgbClr' % A, solidFill, {'val': color})

        return sp

    def add_line(self, left_cm, top_cm, width_cm, color, thickness=1):
        """添加横线"""
        sp = Element('{%s}sp' % P)

        nvSpPr = elem('{%s}nvSpPr' % P, sp)
        elem('{%s}cNvPr' % P, nvSpPr, {'id': '0', 'name': 'line'})
        elem('{%s}cNvSpPr' % P, nvSpPr)
        elem('{%s}nvPr' % P, nvSpPr)

        spPr = elem('{%s}spPr' % P, sp)
        xfrm = elem('{%s}xfrm' % A, spPr)
        elem('{%s}off' % A, xfrm, {'x': str(EMU(left_cm)), 'y': str(EMU(top_cm))})
        elem('{%s}ext' % A, xfrm, {'cx': str(EMU(width_cm)), 'cy': str(EMU(thickness))})
        elem('{%s}prstGeom' % A, spPr, {'prst': 'line'})

        ln = elem('{%s}ln' % A, spPr, {'w': str(int(thickness * 12700))})
        solidFill = elem('{%s}solidFill' % A, ln)
        elem('{%s}srgbClr' % A, solidFill, {'val': color})

        return sp

    def _build_rels(self, items):
        rels = Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationships')
        rels.set('xmlns', 'http://schemas.openxmlformats.org/package/2006/relationships')
        for rid, rtype, target in items:
            e = Element('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
            e.set('Id', rid)
            e.set('Type', rtype)
            e.set('Target', target)
            rels.append(e)
        return self._xml_str(rels)

    def _xml_str(self, el):
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + tostring(el, encoding='unicode')

# ============================================================
# 幻灯片模板
# ============================================================

def cover_slide():
    """封面幻灯片"""
    sb = SlideBuilder()

    # 深蓝色顶部色块
    sb.shapes.append(sb.add_filled_rect(0, 0, 33.87, 19.05, COLOR_PRIMARY))

    # 装饰线
    sb.shapes.append(sb.add_line(3, 8.8, 8, COLOR_GOLD, 3))

    # 主标题
    sb.shapes.append(sb.add_text_box(3, 5, 28, 4, [
        {'text': '近三年女性盆底功能障碍性疾病', 'size': 3600, 'bold': True, 'color': COLOR_WHITE, 'align': 'l', 'font': '微软雅黑'},
    ]))
    sb.shapes.append(sb.add_text_box(3, 7, 28, 2.5, [
        {'text': '非手术治疗效果研究', 'size': 3600, 'bold': True, 'color': COLOR_GOLD, 'align': 'l', 'font': '微软雅黑'},
    ]))

    # 副标题
    sb.shapes.append(sb.add_text_box(3, 10.5, 28, 2, [
        {'text': '—— 涉及民族、年龄、生活习惯与心理因素的多维度分析', 'size': 2000, 'bold': False, 'color': COLOR_LIGHT, 'align': 'l', 'font': '微软雅黑'},
    ]))

    # 底部信息
    sb.shapes.append(sb.add_text_box(3, 14.5, 28, 1.5, [
        {'text': '专业培训研讨会   ·   2026年7月', 'size': 1600, 'bold': False, 'color': COLOR_LIGHT, 'align': 'l', 'font': '微软雅黑'},
    ]))

    return sb

def section_header(title, subtitle=""):
    """章节分隔页"""
    sb = SlideBuilder()

    # 左侧深蓝色块
    sb.shapes.append(sb.add_filled_rect(0, 0, 15, 19.05, COLOR_PRIMARY))
    # 右侧白色
    sb.shapes.append(sb.add_filled_rect(15, 0, 18.87, 19.05, COLOR_WHITE))

    # 左侧装饰线
    sb.shapes.append(sb.add_line(3, 9, 3, COLOR_GOLD, 3))

    # 章节标题（左侧）
    sb.shapes.append(sb.add_text_box(3, 7.5, 10, 3, [
        {'text': title, 'size': 3200, 'bold': True, 'color': COLOR_WHITE, 'align': 'l', 'font': '微软雅黑'},
    ]))

    if subtitle:
        sb.shapes.append(sb.add_text_box(3, 10, 10, 2, [
            {'text': subtitle, 'size': 1800, 'bold': False, 'color': COLOR_LIGHT, 'align': 'l', 'font': '微软雅黑'},
        ]))

    return sb

def content_slide(title, bullet_items, note=""):
    """内容幻灯片 - 左侧标题，右侧要点"""
    sb = SlideBuilder()

    # 顶部标题栏
    sb.shapes.append(sb.add_filled_rect(0, 0, 33.87, 2.8, COLOR_PRIMARY))
    sb.shapes.append(sb.add_text_box(2, 0.3, 30, 2, [
        {'text': title, 'size': 2800, 'bold': True, 'color': COLOR_WHITE, 'align': 'l', 'font': '微软雅黑'},
    ]))

    # 装饰线
    sb.shapes.append(sb.add_line(2, 2.9, 5, COLOR_GOLD, 3))

    # 内容 - 两列布局
    mid = len(bullet_items) // 2 + len(bullet_items) % 2
    y_start = 3.8
    line_h = 1.15

    # 左列
    for i, item in enumerate(bullet_items[:mid]):
        y = y_start + i * line_h
        sb.shapes.append(sb.add_text_box(2, y, 14, line_h, [
            {'text': f'● {item}', 'size': 1400, 'bold': False, 'color': COLOR_BLACK, 'align': 'l', 'font': '微软雅黑'},
        ]))

    # 右列
    for i, item in enumerate(bullet_items[mid:]):
        y = y_start + i * line_h
        sb.shapes.append(sb.add_text_box(17, y, 15.5, line_h, [
            {'text': f'● {item}', 'size': 1400, 'bold': False, 'color': COLOR_BLACK, 'align': 'l', 'font': '微软雅黑'},
        ]))

    if note:
        sb.shapes.append(sb.add_text_box(2, 17, 30, 1.2, [
            {'text': note, 'size': 1100, 'bold': False, 'color': COLOR_GRAY, 'align': 'l', 'font': '微软雅黑'},
        ]))

    # 右下页码装饰
    sb.shapes.append(sb.add_filled_rect(32, 18.5, 1.87, 0.55, COLOR_ACCENT))

    return sb

def content_slide_full(title, bullet_items, note=""):
    """内容幻灯片 - 单列全宽"""
    sb = SlideBuilder()

    sb.shapes.append(sb.add_filled_rect(0, 0, 33.87, 2.8, COLOR_PRIMARY))
    sb.shapes.append(sb.add_text_box(2, 0.3, 30, 2, [
        {'text': title, 'size': 2800, 'bold': True, 'color': COLOR_WHITE, 'align': 'l', 'font': '微软雅黑'},
    ]))
    sb.shapes.append(sb.add_line(2, 2.9, 5, COLOR_GOLD, 3))

    y_start = 3.6
    line_h = 1.1

    for i, item in enumerate(bullet_items):
        y = y_start + i * line_h
        sb.shapes.append(sb.add_text_box(2.5, y, 29, line_h, [
            {'text': f'● {item}', 'size': 1400, 'bold': False, 'color': COLOR_BLACK, 'align': 'l', 'font': '微软雅黑'},
        ]))

    if note:
        sb.shapes.append(sb.add_text_box(2, 17, 30, 1.2, [
            {'text': note, 'size': 1100, 'bold': False, 'color': COLOR_GRAY, 'align': 'l', 'font': '微软雅黑'},
        ]))

    sb.shapes.append(sb.add_filled_rect(32, 18.5, 1.87, 0.55, COLOR_ACCENT))

    return sb

def data_table_slide(title, headers, rows, note=""):
    """数据表格幻灯片"""
    sb = SlideBuilder()

    sb.shapes.append(sb.add_filled_rect(0, 0, 33.87, 2.8, COLOR_PRIMARY))
    sb.shapes.append(sb.add_text_box(2, 0.3, 30, 2, [
        {'text': title, 'size': 2400, 'bold': True, 'color': COLOR_WHITE, 'align': 'l', 'font': '微软雅黑'},
    ]))
    sb.shapes.append(sb.add_line(2, 2.9, 5, COLOR_GOLD, 3))

    # 表格头部
    ncols = len(headers)
    col_w = 29.5 / ncols
    y = 3.6
    row_h = 0.9

    # 表头背景
    sb.shapes.append(sb.add_filled_rect(2.2, y, 29.5, row_h, COLOR_PRIMARY))

    for j, h in enumerate(headers):
        x = 2.2 + j * col_w
        sb.shapes.append(sb.add_text_box(x + 0.1, y + 0.05, col_w - 0.2, row_h, [
            {'text': h, 'size': 1200, 'bold': True, 'color': COLOR_WHITE, 'align': 'c', 'font': '微软雅黑'},
        ]))

    # 表格行
    for i, row in enumerate(rows):
        y = 4.5 + i * row_h
        bg_color = COLOR_WHITE if i % 2 == 0 else COLOR_LIGHT
        sb.shapes.append(sb.add_filled_rect(2.2, y, 29.5, row_h, bg_color))

        for j, cell in enumerate(row):
            x = 2.2 + j * col_w
            sb.shapes.append(sb.add_text_box(x + 0.1, y + 0.05, col_w - 0.2, row_h, [
                {'text': cell, 'size': 1100, 'bold': False, 'color': COLOR_BLACK, 'align': 'c', 'font': '微软雅黑'},
            ]))

    if note:
        sb.shapes.append(sb.add_text_box(2, 17, 30, 1.2, [
            {'text': note, 'size': 1000, 'bold': False, 'color': COLOR_GRAY, 'align': 'l', 'font': '微软雅黑'},
        ]))

    sb.shapes.append(sb.add_filled_rect(32, 18.5, 1.87, 0.55, COLOR_ACCENT))

    return sb

def end_slide():
    """结束页"""
    sb = SlideBuilder()

    sb.shapes.append(sb.add_filled_rect(0, 0, 33.87, 19.05, COLOR_PRIMARY))
    sb.shapes.append(sb.add_line(3, 8.5, 8, COLOR_GOLD, 3))

    sb.shapes.append(sb.add_text_box(3, 6, 28, 3, [
        {'text': '感谢聆听', 'size': 4400, 'bold': True, 'color': COLOR_WHITE, 'align': 'l', 'font': '微软雅黑'},
    ]))

    sb.shapes.append(sb.add_text_box(3, 9.5, 28, 2, [
        {'text': '欢迎提问与讨论', 'size': 2400, 'bold': False, 'color': COLOR_LIGHT, 'align': 'l', 'font': '微软雅黑'},
    ]))

    sb.shapes.append(sb.add_text_box(3, 13, 28, 2, [
        {'text': '关注女性盆底健康，从科学防治开始', 'size': 1800, 'bold': False, 'color': COLOR_GOLD, 'align': 'l', 'font': '微软雅黑'},
    ]))

    return sb

# ============================================================
# 构建所有幻灯片
# ============================================================

def main():
    pptx = PPTXBuilder()

    # === 第一部分：封面与目录 ===

    # 幻灯片1: 封面
    pptx.add_slide(cover_slide())

    # 幻灯片2: 目录
    pptx.add_slide(content_slide_full('目  录', [
        '一、女性盆底功能障碍性疾病（PFD）概述',
        '二、流行病学特征 —— 民族差异分析',
        '三、年龄因素对PFD的影响',
        '四、生活习惯相关危险因素',
        '五、心理因素与PFD的双向关系',
        '六、非手术治疗方法体系总览',
        '七、盆底肌训练（PFMT）—— 一线治疗基石',
        '八、生物反馈与电刺激联合治疗',
        '九、磁刺激与物理治疗新技术',
        '十、激光/射频与再生医学治疗',
        '十一、中医药治疗与中西医结合',
        '十二、心理干预与综合护理策略',
        '十三、综合治疗方案与临床效果',
        '十四、2024-2025年最新研究趋势',
        '十五、总结与未来展望',
    ]))

    # === 第二部分：PFD概述 ===

    pptx.add_slide(section_header('第一部分', '女性盆底功能障碍性疾病概述'))

    pptx.add_slide(content_slide('什么是盆底功能障碍性疾病（PFD）？', [
        '定义：盆底支持结构（肌肉、筋膜、韧带）损伤或功能减退导致的一组疾病',
        '主要类型：压力性尿失禁（SUI）、盆腔器官脱垂（POP）、性功能障碍、慢性盆腔痛',
        '全球患病率：女性PFD患病率约17.8%~74.07%，部分地区高达70.19%',
        '中国现状：我国女性PFD发病率约40%，产后女性更高，是重要的公共卫生问题',
        '核心病理：盆底肌肉、筋膜、韧带损伤，胶原蛋白代谢异常，雌激素水平下降',
        '高危人群：产后女性、围绝经期/绝经后女性、肥胖者、重体力劳动者',
    ]))

    pptx.add_slide(content_slide('PFD的临床分型与核心症状', [
        '压力性尿失禁（SUI）：咳嗽、打喷嚏、运动时漏尿，最常见类型',
        '急迫性尿失禁（UUI）：突发强烈尿意后不自主漏尿',
        '盆腔器官脱垂（POP）：子宫、膀胱、直肠等器官下移，有坠胀感',
        '大便失禁/排便困难：肛门括约肌功能减退所致',
        '慢性盆腔疼痛：持续≥6个月的非周期性盆腔疼痛',
        '性功能障碍：性交疼痛、性欲减退、性满意度下降',
        '膀胱过度活动症（OAB）：尿频、尿急，伴或不伴尿失禁',
    ], '注：同一患者常同时存在多种PFD亚型，临床需综合评估'))

    pptx.add_slide(content_slide('PFD的发病机制', [
        '解剖学机制：盆底"吊床"结构受损——韧带松弛、筋膜撕裂、肛提肌断裂',
        '内分泌机制：雌激素↓ → 胶原纤维合成↓ → 盆底组织弹性↓、萎缩变薄',
        '神经肌肉机制：阴部神经损伤 → 盆底肌去神经支配 → 肌力减退',
        '结缔组织机制：Collagen I/III 比例失调 → 组织机械强度降低',
        '分子机制：基质金属蛋白酶（MMPs）异常激活 → 细胞外基质降解加速',
        '腹内压机制：长期高腹压（肥胖、便秘、慢性咳嗽）→ 盆底超负荷',
    ], '理解发病机制有助于制定个体化非手术治疗方案'))

    # === 第三部分：民族差异 ===

    pptx.add_slide(section_header('第二部分', '流行病学特征 —— 民族差异'))

    pptx.add_slide(content_slide_full('多民族流行病学数据概览', [
        '贵州苗族：POP患病率51.00%（最高），UI患病率12.00%（最低）—— 可能因素：负重劳动、攀爬习惯 → POP高发；低脂饮食、较晚绝经 → UI低发',
        '贵州布依族：POP患病率17.02%，UI患病率23.40% —— 中等水平',
        '贵州汉族：POP患病率21.00%，UI患病率34.00%（最高）—— 可能与生活方式、分娩方式差异有关',
        '西藏藏族：PFDI-20盆底功能障碍评分显著高于当地汉族（P<0.05）—— 高原环境、多产次、重体力劳动',
        '新疆维族vs汉族：胶原蛋白I/III表达水平差异显著；雌激素受体SNP位点（rs17847075、rs1256049）基因型频率显著不同',
    ], '注：民族是PFD的独立危险因素 —— 多因素Logistic回归证实（P<0.05）'))

    pptx.add_slide(data_table_slide('不同民族PFD患病率与特点比较',
        ['民族', 'POP患病率', 'UI患病率', '分子特征', '主要关联因素'],
        [
            ['苗族', '51.00%（最高）', '12.00%（最低）', '待研究', '重体力劳动、健康意识较低'],
            ['布依族', '17.02%', '23.40%', '待研究', '中等程度'],
            ['汉族（贵州）', '21.00%', '34.00%（最高）', '参照组', '分娩方式、生活方式'],
            ['藏族', '评分显著较高', '较高', '待研究', '高原环境、多产次'],
            ['维族', '较高', '较高', 'Col I/III表达差异\\nER基因多态性差异', '遗传背景、胶原代谢'],
        ],
    '数据来源：贵州医科大学、西藏自治区研究（2023-2024）、新疆医科大学'))

    pptx.add_slide(content_slide('民族差异的深层机制与临床意义', [
        '遗传因素：不同民族间胶原蛋白基因、雌激素受体基因（ESR1/ESR2）多态性差异',
        '环境适应：高海拔藏族的盆腔解剖适应性差异，低氧环境影响组织修复',
        '社会经济因素：不同民族地区医疗保健可及性、健康素养水平差异显著',
        '劳动模式：苗族女性多从事山地负重劳动 → 慢性腹压增高 → POP风险↑',
        '膳食结构：苗族低脂饮食、多摄入植物性蛋白 → UI风险相对较低（保护因素）',
        '生育模式：不同民族生育次数、分娩方式、产后休养习俗差异',
        '临床启示：民族针对性预防策略 → 少数民族地区应加强盆底健康教育',
    ]))

    # === 第四部分：年龄因素 ===

    pptx.add_slide(section_header('第三部分', '年龄因素对PFD的影响'))

    pptx.add_slide(content_slide_full('年龄：PFD最重要的不可控危险因素', [
        '🔑 年龄每增加1岁 → 盆底肌力异常风险增加1.181倍（OR=1.181，邯郸市1532例调查，2025）',
        '🔑 35岁以后女性POP发生风险是年轻女性的2.44倍；50岁以后为1.86倍（2024专家共识）',
        '🔑 >55岁老年女性PFD患病率达48.60%，呈持续上升趋势（浙江临床医学，2025）',
        '🔑 SUI患病率高峰在45-59岁（EAU指南，2025）',
        '🔑 绝经是PFD显著危险因素（OR=2.686）—— 雌激素水平断崖式下降是关键机制',
        '🔑 绝经年龄越早，PFD发病风险越高 —— 观察组绝经年龄49.33±3.71岁 vs 对照组54.01±4.28岁',
    ], '年龄效应贯穿PFD全程：从产后、围绝经到老年期，各阶段干预策略不同'))

    pptx.add_slide(content_slide('年龄相关PFD的生理机制', [
        '雌激素下降：绝经后E2水平↓ → 盆底组织胶原合成↓50%以上 → 组织萎缩松弛',
        '肌肉衰减：随年龄增长盆底肌纤维数量↓、肌力↓，快肌纤维（II型）减少尤其明显',
        '神经退行性变：阴部神经传导速度减慢 → 盆底肌反应延迟 → 控尿能力↓',
        '筋膜弹性退化：盆内筋膜弹性纤维断裂，韧性降低 → 器官支撑力下降',
        '累积暴露效应：年龄越大，生育、便秘、重体力劳动等危险因素累积暴露时间越长',
        '合并症累积：高血压、糖尿病、慢性呼吸道疾病等随年龄增加而累积 → 加重PFD',
    ]))

    pptx.add_slide(data_table_slide('不同年龄段PFD防治策略',
        ['年龄段', 'PFD风险特征', '防治重点', '推荐非手术治疗'],
        [
            ['孕产期（20-40岁）', '妊娠+分娩损伤', '产后42天盆底评估\\n产后康复黄金期', 'PFMT、生物反馈、\\n产后康复操'],
            ['围绝经期（40-55岁）', '雌激素波动式下降\\nPFD加速进展期', '激素评估+盆底筛查\\n生活方式干预', 'PFMT+电刺激、\\n磁刺激、激光治疗'],
            ['绝经后期（55-65岁）', '雌激素持续低水平\\nPOP高发期', '综合评估、多学科管理\\n阴道雌激素+盆底康复', '联合治疗：PFMT+电刺激\\n+中医+阴道雌激素'],
            ['老年期（>65岁）', '合并症多、肌力差\\n治疗依从性下降', '安全优先、个体化\\n家庭支持、心理关怀', '温和PFMT、居家训练\\n数字化远程康复'],
        ],
    ))

    # === 第五部分：生活习惯 ===

    pptx.add_slide(section_header('第四部分', '生活习惯相关危险因素'))

    pptx.add_slide(content_slide_full('九大可改变的生活习惯危险因素（2025年最新数据）', [
        '❶ 久坐不动：OR=2.834 —— 盆底肌力异常的最强预测因素，每45分钟应起身活动',
        '❷ 腹型肥胖：OR=2.318 —— BMI>30者盆底疾病风险增加2倍；目标BMI<24、腰围<85cm',
        '❸ 重体力劳动：OR=2.339 —— 长期负重、高强度劳动导致慢性腹压增高',
        '❹ 长期便秘：OR=2.152 —— 排便时用力屏气 → 盆底反复超负荷',
        '❺ 如厕时间≥10分钟：OR=1.964 —— 应控制在5分钟以内',
        '❻ 焦虑：OR=1.815 —— 精神心理因素对盆底功能有直接负面影响',
        '❼ 性生活频率≥3次/周：OR=1.690 —— 盆底肌持续高张力的潜在影响（2025新发现）',
        '❽ 吸烟/饮酒：多项研究确认为PFD危险因素；慢性咳嗽加重腹压',
        '❾ 长期站立/高跟鞋：女教师人群中两者均为SUI/POP独立危险因素',
    ], '来源：邯郸市1532名成年女性调查（2025）、重庆市1342例女教师调查（2024）、EAU指南（2025）'))

    pptx.add_slide(content_slide('生活方式的保护因素与预防建议', [
        '规律运动：游泳、骑行等低冲击有氧运动优先；避免高强度跑跳',
        '凯格尔运动：每天3组×8-12次收缩，每次保持6-8秒，持之以恒',
        '体重管理：BMI控制在18.5-24 kg/m²，腰围<85cm（中国女性标准）',
        '排便习惯：增加膳食纤维（≥25g/天）、充足饮水（>1.5L/天）、定时排便',
        '戒烟限酒：吸烟者PFD风险显著升高；限制酒精摄入',
        '腹压管理：治疗慢性咳嗽、过敏性鼻炎、避免长期束腹带',
        '正确姿势：减少久坐时间，避免长时间蹲姿；搬重物时屈膝不弯腰',
        '产后护理：产后6周行盆底肌力评估，肌力≤3级者应接受康复治疗',
    ]))

    # === 第六部分：心理因素 ===

    pptx.add_slide(section_header('第五部分', '心理因素与PFD的双向关系'))

    pptx.add_slide(content_slide_full('PFD患者心理问题的流行病学与影响', [
        '🔴 约30%的PFD患者伴随焦虑症状（焦虑发生率30.9%，抑郁发生率30.3%）—— 2025年综述',
        '🔴 PFIQ-7盆底功能评分与抑郁、焦虑、失眠显著正相关（P<0.0001，Molina-Barea 2024）',
        '🔴 焦虑程度与盆底肌筋膜疼痛程度显著正相关（r=0.411, P=0.002，刘小梦等 2025）',
        '🔴 PFD症状越重 → 生活质量越低 → 心理困扰越深 → 形成恶性循环',
        '🔴 关键问题：PFD是心理困扰的"因"还是"果"？—— 成功治疗PFD后焦虑/抑郁显著改善（Kalata 2024），支持PFD→心理困扰的因果方向',
        '🔴 心理困扰使患者治疗依从性↓45% → 非手术治疗效果大打折扣',
    ]))

    pptx.add_slide(content_slide('心理干预在PFD治疗中的重要作用', [
        '正念认知疗法：12周干预 → PFDI-20评分↓21.9%、GDS-15抑郁评分↓25.9%、SF-36生活质量↑10.8%',
        '多学科心理支持团队：精神科医师+盆底康复师+护理专家 → 协同管理身心症状',
        '循证理念整体护理：涵盖疾病认知纠正+盆底锻炼指导+心理疏导+家庭支持+生活指导',
        '盆底康复操+音乐放松训练：自然分娩产妇SAS焦虑↓、SDS抑郁↓、GQOLI-74生活质量↑',
        'Greene健康教育模式：健康知识讲解+行为指导+心理支持 → 消除误解与恐惧',
        'Newman护理模式（整体系统护理）：SAS/SDS评分显著降低，盆底肌力等级↑，SF-36↑',
    ]))

    pptx.add_slide(content_slide('心理健康评估与筛查建议', [
        '评估时机：PFD初诊时、治疗开始前、治疗后4周、12周各评估一次',
        '推荐量表：GAD-7（广泛性焦虑）、PHQ-9（患者健康问卷抑郁量表）、HADS（医院焦虑抑郁量表）',
        '评估维度：焦虑、抑郁、躯体化症状、睡眠质量、性心理健康、社会功能',
        '高危识别：既往精神病史、社会支持不足、PFD症状严重、治疗期望不现实',
        '转诊指征：重度焦虑/抑郁（PHQ-9≥15或GAD-7≥15）→ 转精神科/心理科',
        '健康教育要点：帮助患者理解PFD是可治疗的，减轻羞耻感与病耻感',
    ]))

    # === 第七部分：非手术治疗方法体系 ===

    pptx.add_slide(section_header('第六部分', '非手术治疗方法体系总览'))

    pptx.add_slide(data_table_slide('非手术治疗方法分类与证据等级（2024-2025）',
        ['治疗类别', '代表方法', '证据等级', '适用人群', '疗程'],
        [
            ['盆底肌训练（PFMT）', 'Kegel训练、功能性PFMT', 'A级（最高）', '所有PFD患者', '≥12周'],
            ['生物反馈疗法', 'EMG生物反馈、压力生物反馈', 'A级', '盆底肌感知差者', '8-12周'],
            ['电刺激治疗', '阴道内电刺激、体表电刺激', 'A级（联合PFMT）', 'SUI、肌力极弱者', '8-12周'],
            ['磁刺激治疗', '体外盆底磁刺激', 'B级', '围绝经期PFD', '4-8周'],
            ['激光/射频治疗', 'CO₂点阵激光、射频', 'B级（新兴）', '轻中度SUI、阴道松弛', '3-5次/疗程'],
            ['中医药治疗', '补中益气汤、针灸', 'B级', '中老年FPFD', '8-12周'],
            ['再生医学', 'PRP、干细胞注射', 'C级（探索）', '研究阶段', '个体化'],
            ['数字化康复', 'mHealth APP+PFMT', 'B级（新兴）', '依从性不足者', '≥8周'],
        ],
    '注：A级=Cochrane/Meta分析支持；B级=高质量RCT支持；C级=初步临床证据'))

    # === 第八部分：PFMT ===

    pptx.add_slide(section_header('第七部分', '盆底肌训练（PFMT）—— 一线治疗基石'))

    pptx.add_slide(content_slide_full('PFMT的核心循证证据（Cochrane 2024更新）', [
        '📊 Cochrane系统评价（2024）：纳入63项RCT、4920例女性 —— PFMT是目前证据最充分的PFD保守治疗',
        '📊 直接PFMT（孤立盆底肌收缩）优于间接训练 —— 生活质量改善 SMD=0.70（低确定性证据）',
        '📊 绝经后女性PFMT效果：SUI严重程度显著降低 SMD=-1.30（95%CI -1.97~-0.62），92%概率获益',
        '📊 慢性盆腔痛：荟萃8项RCT，PFMT显著减轻疼痛 SMD=-1.25~-1.30，改善肌力和生活质量',
        '📊 功能性PFMT（融合核心肌群协同收缩+多体位训练）优于传统PFMT —— 肌力↑、漏尿量↓、依从率↑',
        '📊 个体vs团体督导：效果差异无统计学意义（中等确定性证据）—— 均可推荐',
        '📊 e-Health远程PFMT：优于书面指导，接近面对面指导效果 —— 提高可及性的有效方案',
    ]))

    pptx.add_slide(content_slide('PFMT的实施要点与技术规范', [
        '训练频率：每天3组×8-12次收缩，每周坚持5-7天，至少持续12周',
        '收缩保持：每次收缩保持6-8秒 → 充分放松6-8秒 → 避免肌肉疲劳',
        '正确技巧：只收缩盆底肌 → 避免腹肌、臀部、大腿内收肌代偿 → 配合呼吸',
        '体位进阶：仰卧→坐位→站立→行走中训练 → 逐步增加难度',
        '核心协同：功能性PFMT融合膈肌呼吸+腹横肌激活+多裂肌协同',
        '监督模式：初始阶段建议专业人士指导 → 确认动作正确后过渡至家庭训练',
        '依从性提升：使用手机APP提醒+训练日志+可视化进度反馈',
    ]))

    # === 第九部分：生物反馈与电刺激 ===

    pptx.add_slide(section_header('第八部分', '生物反馈与电刺激联合治疗'))

    pptx.add_slide(content_slide_full('生物反馈电刺激联合治疗的核心证据', [
        '🔬 Meta分析（Li等，2025）：8项研究、885名SUI患者 —— PFMT+电刺激联合治疗显著优于单一治疗',
        '🔬 尿失禁症状改善：OR=1.42（95%CI 1.10-1.85）；盆底肌力提高：OR=1.55（95%CI 1.20-2.05）',
        '🔬 生活质量提升：OR=4.29（95%CI 3.68-4.99）—— 联合治疗对生活质量的改善效果最为突出',
        '🔬 盆底磁刺激+肌电生物反馈（邓米娜等，2025）：围绝经期PFD总有效率97.10% vs 单一88.24%',
        '🔬 Greene健康教育+生物反馈电刺激+Kegel（Yuan 2024）：焦虑/抑郁↓、性生活质量↑、盆底肌力↑',
        '🔬 阴道内电刺激（IVES）系统评价（2025）：32项RCT，75%报告尿垫使用显著减少',
    ]))

    pptx.add_slide(content_slide('生物反馈与电刺激的操作技术要点', [
        '生物反馈原理：阴道/肛门内置传感器 → 实时显示盆底肌活动 → 视觉/听觉反馈指导训练',
        '电刺激参数：频率20-50Hz（SUI）、5-10Hz（OAB/UUI）；脉宽200-400μs；强度"感觉阈-运动阈"之间',
        '治疗频次：每次20-30分钟，每周2-3次，8-12周为一疗程',
        '联合模式：先电刺激被动激活肌肉（10-15min）→ 再生物反馈主动训练（10-15min）',
        '个体化处方：根据盆底肌力分级（Oxford 0-5级）制定不同的电刺激-生物反馈方案',
        '禁忌症：妊娠期、盆腔急性感染、恶性肿瘤、心脏起搏器、严重心律失常',
    ]))

    # === 第十部分：磁刺激与物理治疗新技术 ===

    pptx.add_slide(section_header('第九部分', '磁刺激与物理治疗新技术'))

    pptx.add_slide(content_slide_full('2024-2025年物理治疗新技术亮点', [
        '⚡ HIFEM（高强度聚焦电磁刺激）：非侵入性诱发深层盆底肌高强度收缩，8-12次/4-6周，疗效维持6-18个月',
        '⚡ Li-ESWT（低强度体外冲击波）：促进血管生成+肌肉再生，6次/8周，疗效维持12-24个月，无创安全',
        '⚡ 盆底磁刺激（FMS）：体外磁场穿透 → 无痛激活盆底神经肌肉 → 围绝经期PFD联合治疗有效率97.10%',
        '⚡ CO₂点阵激光：促进阴道黏膜新胶原形成 → 改善尿道/阴道结缔组织松弛，3-5次可维持12-24个月',
        '⚡ 射频治疗（RF）：热效应使胶原纤维即刻收缩+长期新生重塑 → 阴道紧致+轻度SUI改善',
        '⚡ 功能性PFMT：核心肌群协同收缩+多体位训练 → 优于传统孤立PFMT（中国康复研究中心，2025）',
    ]))

    pptx.add_slide(data_table_slide('新兴物理治疗技术对比',
        ['技术', '原理', '疗程', '疗效维持', '适用场景', '2025证据'],
        [
            ['HIFEM', '聚焦电磁 → 超强肌缩', '8-12次/4-6周', '6-18个月', '盆底肌力弱者', 'Meta分析支持'],
            ['Li-ESWT', '冲击波 → 血管+肌肉再生', '6次/8周', '12-24个月', 'SUI、慢性盆腔痛', '多项RCT支持'],
            ['磁刺激', '体外磁场 → 神经肌肉激活', '2-3次/周×8周', '6-12个月', '围绝经期PFD', '97.10%有效率'],
            ['CO₂激光', '热损伤 → 新胶原形成', '3-5次', '12-24个月', '轻中度SUI、阴道松弛', 'RCT+Meta分析'],
            ['射频', '热效应 → 胶原重塑', '3-6次', '6-18个月', '阴道松弛、轻度SUI', '初步RCT证据'],
        ],
    ))

    # === 第十一部分：中医药 ===

    pptx.add_slide(section_header('第十部分', '中医药治疗与中西医结合'))

    pptx.add_slide(content_slide_full('补中益气汤联合生物反馈电刺激：多项2025研究验证', [
        '🌟 常熟市中医院（陆燕等，2025）：补中益气颗粒+电刺激 → ICI-Q-SF评分显著↓、盆底肌力↑、SOD/GSH-Px抗氧化指标↑',
        '🌟 南昌大学二附院（平璐依等，2025）：三维盆底超声客观评估 → BND↓、URA↓、LHA↓（肛提肌裂孔面积缩小）',
        '🌟 机制分析：补中益气 → 升阳举陷 → 增强盆底组织张力；调节胶原代谢 → 促进组织修复',
        '🌟 现代药理：黄芪、升麻、柴胡含异黄酮类物质 → 类雌激素样作用 → 协同盆底康复',
        '🌟 中西医协同优势：西医物理治疗"修复结构"+中医内调"补益气血" → 标本兼治',
        '🌟 综合疗效：联合治疗总有效率显著高于单一西医治疗，且不良反应少，远期复发率低',
    ]))

    pptx.add_slide(content_slide('中医药在PFD中的整体治疗方案', [
        '内服方剂：补中益气汤加减（黄芪、党参、白术、升麻、柴胡、当归、陈皮、甘草）',
        '针灸疗法：取穴——关元、气海、中极、足三里、三阴交、肾俞、次髎',
        '艾灸疗法：温灸关元、神阙 → 温阳固脱 → 适用于虚寒体质PFD患者',
        '中药熏蒸/坐浴：蛇床子、苦参、黄柏熏蒸 → 改善阴道局部血液循环',
        '推拿按摩：特定穴位按摩 → 改善盆腔气血运行',
        '辨证分型：气虚下陷型（最常见）、肾虚不固型、湿热下注型 → 个体化方药',
        '中药+盆底康复：中西医联合方案——2024-2025年多中心RCT证实疗效优越',
    ], '注意事项：中药需在中医师辨证指导下使用，避免盲目自行服药'))

    # === 第十二部分：心理干预 ===

    pptx.add_slide(section_header('第十一部分', '心理干预与综合护理策略'))

    pptx.add_slide(content_slide_full('多学科心理支持的核心模式（2024-2025 循证）', [
        '🧠 多学科团队构成：盆底康复师+精神心理科医师+护理专家+营养师 —— 协同管理',
        '🧠 正念认知疗法（MBCT）：12周干预 → PFDI-20↓21.9%、GDS-15抑郁↓25.9%、QoL↑10.8%（刘亚旗 2025）',
        '🧠 Newman整体护理模式：SAS/SDS↓、SF-36↑、盆底肌力等级↑（Wang 2024，随机对照）',
        '🧠 Greene健康教育+心理支持+行为指导：焦虑↓、抑郁↓、性生活质量↑、肌力EMG↑（Yuan 2024）',
        '🧠 远程数字化DCP：教育+PFMT+实时生物反馈 → PHQ-9/GAD-7↓、症状改善、满意度8.9/10（Janela 2024）',
        '🧠 核心机制：正确认知PFD → 消除羞耻感与病耻感 → 提高治疗信心与依从性 → 正向反馈循环',
    ]))

    pptx.add_slide(content_slide('综合护理与患者教育的实施框架', [
        '认知教育：PFD是可治疗的疾病，不是"年纪大了正常现象"—— 打消病耻感',
        '行为指导：一对一盆底肌收缩动作教学 → 确保动作正确性 → 提供书面/视频材料',
        '心理疏导：识别焦虑/抑郁信号 → 认知重构 → 必要时转介心理咨询',
        '家庭支持：动员配偶/家人参与 → 理解疾病本质 → 提供情感与行为支持',
        '随访管理：治疗后1周、4周、12周、24周评估 → 及时调整方案',
        '数字化工具：微信/APP推送提醒+训练日志+在线咨询 → 提高可及性',
    ]))

    # === 第十三部分：综合治疗方案 ===

    pptx.add_slide(section_header('第十二部分', '综合治疗方案与临床效果评估'))

    pptx.add_slide(content_slide_full('PFD非手术治疗的综合策略——"五维一体"模式', [
        '🎯 维度一【物理治疗】：PFMT（基础）+电刺激/磁刺激/HIFEM（强化）—— 重建盆底肌力与耐力',
        '🎯 维度二【行为干预】：体重管理+便秘防治+腹压控制+正确姿势 —— 消除致病因素',
        '🎯 维度三【药物辅助】：阴道低剂量雌激素（绝经后）+中药内服（辨证施治）—— 改善组织状态',
        '🎯 维度四【心理管理】：认知教育+正念疗法+心理支持 —— 打破"症状↔焦虑"恶性循环',
        '🎯 维度五【数字化管理】：mHealth APP远程监测+在线指导+智能提醒 —— 提高长期依从性',
        '',
        '💡 核心原则：联合治疗 > 单一治疗 | 个体化方案 > 标准化方案 | 长期管理 > 短期干预',
    ]))

    pptx.add_slide(data_table_slide('不同类型PFD的推荐非手术治疗方案',
        ['PFD类型', '一线方案', '强化/联合方案', '辅助措施', '预期有效率'],
        [
            ['轻中度SUI', 'PFMT（≥12周）', 'PFMT+电刺激/磁刺激', '减重+生活方式调整', '70-90%'],
            ['重度SUI', 'PFMT+电刺激', '磁刺激+HIFEM', '阴道雌激素（绝经后）', '55-70%'],
            ['POP（I-II期）', 'PFMT（核心协同训练）', 'PFMT+电刺激+中医', '减重+便秘管理', '60-80%'],
            ['OAB/UUI', 'PFMT+膀胱训练', '电刺激（低频5-10Hz）', '行为+饮食管理', '65-85%'],
            ['慢性盆腔痛', 'PFMT+手法治疗', '生物反馈+认知行为治疗', '心理干预+放松训练', '60-75%'],
            ['产后PFD', 'PFMT+生物反馈', '电刺激+康复操', '健康宣教+心理支持', '80-95%'],
        ],
    ))

    pptx.add_slide(content_slide('非手术治疗效果的客观评估方法', [
        '盆底肌力评估：改良Oxford分级（0-5级）+ 阴道测压计（Peritron）定量测量',
        '三维盆底超声：BND（膀胱颈移动度）、URA（尿道旋转角）、LHA（肛提肌裂孔面积）',
        '尿动力学检查：最大尿道闭合压、腹压漏尿点压（ALPP）、膀胱顺应性',
        '症状评分量表：ICI-Q-SF（尿失禁）、PFDI-20/PFIQ-7（盆底功能）、POP-Q（脱垂分度）',
        '生活质量量表：SF-36、KHQ（King's健康问卷）、P-QOL（脱垂生活质量）',
        '心理评估：GAD-7、PHQ-9、HADS — 在治疗前后同步评估心理状态变化',
        '生物标志物：血清SOD/GSH-Px（抗氧化指标）→ 评估中医联合治疗效果',
    ]))

    # === 第十四部分：最新研究趋势 ===

    pptx.add_slide(section_header('第十三部分', '2024-2025年最新研究趋势'))

    pptx.add_slide(content_slide_full('2024-2025年五大研究热点与趋势', [
        '🔥 趋势一【联合治疗优于单一治疗】：PFMT+电刺激循证A级（Meta分析，Li 2025）；磁刺激+生物反馈有效率97.10%',
        '🔥 趋势二【中西医结合客观化评估】：三维盆底超声验证补中益气汤联合效果（BND/URA/LHA均显著缩小，2025）',
        '🔥 趋势三【再生医学从实验走向临床】：PRP注射（2次/间隔4-6周，维持3-6月）；干细胞注射初步临床探索',
        '🔥 趋势四【数字化康复全面渗透】：mHealth APP+PFMT系统评价（Hao 2024）；远程DCP满意度8.9/10（Janela 2024）',
        '🔥 趋势五【心理评估纳入常规管理】：多学科心理支持可"逆转"PFD导致的心理问题（Kalata 2024前瞻性研究）',
        '',
        '📌 总趋势：从"单一技术"到"综合体系"、从"经验治疗"到"循证个体化"、从"被动康复"到"主动管理"',
    ]))

    pptx.add_slide(content_slide('值得关注的前沿研究方向', [
        'PRP+PFMT联合方案：自体PRP注射增强组织修复+PFMT强化肌力 → 协同效应（Grigoriadis 2024）',
        'AI辅助盆底超声诊断：深度学习自动测量BND/URA/LHA → 提高诊断效率与一致性',
        '可穿戴盆底训练设备：智能阴道探头+手机APP → 实时反馈+游戏化训练 → 依从性↑',
        '微生物组与PFD：阴道/肠道菌群失调可能与PFD相关 → 益生菌干预新方向',
        '肠道菌群-盆底轴（Gut-Pelvic Axis）：短链脂肪酸（SCFAs）→ 影响胶原合成与炎症 → 新治疗靶点',
        '民族基因组学研究：不同民族PFD易感基因筛查 → 精准预防策略的基础',
    ]))

    # === 第十五部分：总结 ===

    pptx.add_slide(section_header('第十四部分', '总结与未来展望'))

    pptx.add_slide(content_slide_full('核心要点总结', [
        '✅ PFD是高患病率的女性慢性疾病，约30%患者伴随焦虑/抑郁 —— 身心同治是基本原则',
        '✅ 民族差异客观存在：苗族POP 51%、汉族UI 34% —— 遗传+环境+社会文化多因素综合作用',
        '✅ 年龄是不可控但可预判的因素 —— 产后42天、围绝经期是两个"黄金干预窗口期"',
        '✅ 九大可改变生活习惯因素中，久坐（OR=2.834）和肥胖（OR=2.318）是最强预测因子',
        '✅ PFMT是所有PFD治疗的一线基石（Cochrane A级证据），联合治疗显著优于单一治疗',
        '✅ 联合治疗总有效率：产后PFD 80-95%、轻中度SUI 70-90%、围绝经期PFD >97%',
        '✅ 补中益气汤+电刺激/生物反馈 —— 中西医协同标本兼治，是中国特色优势方案',
        '✅ 数字化康复+心理干预 → 提高依从性+改善心理健康 → 构建闭环管理体系',
    ]))

    pptx.add_slide(content_slide('未来展望与行动建议', [
        '🎯 建立中国多民族PFD流行病学数据库 → 揭示民族特异性危险因素与保护因素',
        '🎯 开展多中心RCT验证中西医联合方案 → 推动中医药纳入PFD临床诊疗指南',
        '🎯 开发智能化盆底康复管理平台 → AI+可穿戴设备实现个性化远程康复',
        '🎯 将心理评估纳入PFD诊疗常规 → 精神科/心理科+盆底康复科多学科协作（MDT）',
        '🎯 盆底健康教育纳入妇女保健基本公共卫生服务 → "人人享有盆底健康"',
        '🎯 关注民族地区盆底健康公平性 → 培养少数民族盆底康复人才',
        '🎯 从"治已病"到"治未病" → 加强青春期、孕期、产后、围绝经期盆底健康宣教',
    ]))

    pptx.add_slide(content_slide_full('主要参考文献（2024-2025）', [
        '1. Hay-Smith EJC, et al. Pelvic floor muscle training for urinary incontinence. Cochrane Database Syst Rev, 2024.',
        '2. Li et al. PFMT + Electrical Stimulation for SUI: Meta-analysis. Urol Int, 2025; 109(4): 425.',
        '3. 邓米娜等. 盆底磁刺激联合盆底肌电生物反馈治疗围绝经期PFD. 中国综合临床, 2025.',
        '4. 陆燕等. 补中益气颗粒联合生物反馈电刺激治疗中老年FPFD. 北京大学学报（医学版）, 2025.',
        '5. 平璐依等. 补中益气汤联合生物反馈电刺激的盆底超声评估. 临床超声医学杂志, 2025.',
        '6. Kalata et al. Successful Treatment of SUI/POP on Depression, Anxiety, Insomnia. J Clin Med, 2024.',
        '7. Molina-Barea et al. HRQoL and Psychosocial Variables in Colorectal PFD. Physiother Theory Pract, 2024.',
        '8. 刘亚旗等. 多学科心理支持联合正念认知对老年子宫脱垂患者的效果. 国际医药卫生导报, 2025.',
        '9. Yuan et al. Health Education + Biofeedback ES on Pelvic Floor Psychology. Medicine, 2024; 103(34): e39321.',
        '10. 付静等. 女性SUI新型保守治疗机制与临床转化进展. 昆明医科大学学报, 2025.',
        '11. Lv A, et al. Prevalence of PFD in Parous Women from Tibet. J Multidiscip Healthc, 2024.',
        '12. Janela et al. Digital Care Program for UI in Females. Healthcare, 2024; 12(2): 141.',
        '13. Grigoriadis T, et al. PRP for PFD. 2024.',
        '14. 文芳等. 苗族布依族汉族妇女PFD患病比较. 贵州医科大学学报.',
        '15. 邯郸市成年女性盆底肌力异常调查及影响因素分析. 海南医学, 2025.',
    ]))

    # === 结束页 ===
    pptx.add_slide(end_slide())

    # 生成文件
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), PPT_DIR)
    pptx.build(output_path)
    print(f'✅ PPT已生成：{output_path}')
    print(f'📊 共 {pptx.slide_count} 张幻灯片')

if __name__ == '__main__':
    main()
