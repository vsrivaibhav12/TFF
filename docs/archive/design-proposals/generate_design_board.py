#!/usr/bin/env python3
"""
Generate a comprehensive UX design board image showing all TFF revolution concepts
in one single image for easy review.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Canvas size
W, H = 3200, 5400
M = 40  # margin
G = 30  # gap

# Colors
C = {
    "bg": "#FAFAFA",
    "white": "#FFFFFF",
    "black": "#18181B",
    "gray1": "#F4F4F5",
    "gray2": "#E4E4E7",
    "gray3": "#D4D4D8",
    "gray4": "#A1A1AA",
    "gray5": "#71717A",
    "teal": "#0D9488",
    "teal_light": "#F0FDFA",
    "teal_med": "#CCFBF1",
    "red": "#DC2626",
    "red_light": "#FEF2F2",
    "amber": "#CA8A04",
    "amber_light": "#FFFBEB",
    "emerald": "#16A34A",
    "emerald_light": "#F0FDF4",
    "purple": "#7C3AED",
    "purple_light": "#F5F3FF",
}

img = Image.new("RGB", (W, H), C["bg"])
d = ImageDraw.Draw(img)

# Try to load Inter font, fallback to default
try:
    font_bold_l = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    font_semibold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
    font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    font_reg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    font_xs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
except:
    font_bold_l = ImageFont.load_default()
    font_bold = ImageFont.load_default()
    font_semibold = ImageFont.load_default()
    font_medium = ImageFont.load_default()
    font_reg = ImageFont.load_default()
    font_small = ImageFont.load_default()
    font_xs = ImageFont.load_default()
    font_title = ImageFont.load_default()


def rounded_rect(xy, fill=None, outline=None, radius=12):
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline)


def label(text, x, y, color=C["gray5"], font=font_xs):
    d.text((x, y), text, fill=color, font=font)


def badge(text, x, y, bg, fg, font=font_xs, pad=4):
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    rounded_rect([x, y, x + tw + pad * 2, y + th + pad * 2 + 2], fill=bg, radius=4)
    d.text((x + pad, y + pad), text, fill=fg, font=font)
    return tw + pad * 2


def avatar(initials, x, y, size, bg):
    rounded_rect([x, y, x + size, y + size], fill=bg, radius=size // 4)
    bbox = d.textbbox((0, 0), initials, font=font_xs)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((x + (size - tw) // 2, y + (size - th) // 2 - 1), initials, fill=C["white"], font=font_xs)


def card_header(title, subtitle, x, y, w):
    d.text((x, y), title, fill=C["black"], font=font_bold)
    if subtitle:
        d.text((x, y + 32), subtitle, fill=C["gray5"], font=font_reg)
    return y + 60


# ========== HEADER ==========
d.rectangle([0, 0, W, 140], fill=C["white"])
d.text((M, 45), "The Fiscal Fulcrum — UX Revolution Design Board", fill=C["black"], font=font_title)
d.text((M, 100), "Navigation · Dashboards · Workflows · Tables · Mobile · Detail Patterns", fill=C["gray5"], font=font_reg)

cursor_y = 160

# ========== ROW 1: NAVIGATION + ADMIN DASHBOARD ==========
col_w = (W - M * 2 - G) // 2

# --- Navigation Mockup ---
x1, y1 = M, cursor_y
h_nav = 900
rounded_rect([x1, y1, x1 + col_w, y1 + h_nav], fill=C["white"])
# Left rail
d.rectangle([x1, y1, x1 + 72, y1 + h_nav], fill=C["white"])
d.rectangle([x1 + 72, y1, x1 + 73, y1 + h_nav], fill=C["gray2"])
# Logo
rounded_rect([x1 + 16, y1 + 16, x1 + 56, y1 + 56], fill=C["teal"], radius=12)
d.text((x1 + 24, y1 + 26), "FF", fill=C["white"], font=font_semibold)
# Rail icons
for i, (col, active) in enumerate([
    (C["teal_light"], True), (C["white"], False), (C["white"], False),
    (C["white"], False), (C["white"], False)
]):
    yy = y1 + 90 + i * 60
    rounded_rect([x1 + 12, yy, x1 + 60, yy + 48], fill=col, radius=12)
    if active:
        d.text((x1 + 24, yy + 14), "◆", fill=C["teal"], font=font_reg)
    else:
        d.text((x1 + 24, yy + 14), "○", fill=C["gray4"], font=font_reg)
# Contextual panel
panel_x = x1 + 73
rounded_rect([panel_x, y1, panel_x + 280, y1 + h_nav], fill=C["white"])
d.rectangle([panel_x + 280, y1, panel_x + 281, y1 + h_nav], fill=C["gray2"])
d.text((panel_x + 16, y1 + 20), "Clients", fill=C["black"], font=font_semibold)
d.text((panel_x + 16, y1 + 45), "42 active clients", fill=C["gray5"], font=font_xs)
# Search
rounded_rect([panel_x + 12, y1 + 70, panel_x + 268, y1 + 102], fill=C["gray1"], radius=8)
d.text((panel_x + 20, y1 + 78), "Search clients...", fill=C["gray4"], font=font_xs)
# Recent items
for i, (name, sub, abbr, abbr_col) in enumerate([
    ("Acme Corporation", "3 open tasks", "AC", C["teal"]),
    ("Swadeshi Bazaar", "1 notice due", "SB", C["amber"]),
    ("Krishi Rasayan", "2 queries pending", "KR", C["purple"]),
]):
    yy = y1 + 130 + i * 70
    rounded_rect([panel_x + 12, yy, panel_x + 268, yy + 60], fill=C["gray1"], radius=8)
    rounded_rect([panel_x + 20, yy + 12, panel_x + 52, yy + 44], fill=abbr_col + "20", radius=6)
    d.text((panel_x + 26, yy + 18), abbr, fill=abbr_col, font=font_xs)
    d.text((panel_x + 60, yy + 12), name, fill=C["black"], font=font_small)
    d.text((panel_x + 60, yy + 32), sub, fill=C["gray5"], font=font_xs)
# Main content area
main_x = panel_x + 290
d.text((main_x + 20, y1 + 20), "Clients", fill=C["black"], font=font_bold)
d.text((main_x + 20, y1 + 50), "Manage your client roster, assignments, and portal visibility.", fill=C["gray5"], font=font_reg)
# Add client button
rounded_rect([main_x + col_w - 340, y1 + 20, main_x + col_w - 220, y1 + 50], fill=C["teal"], radius=8)
d.text((main_x + col_w - 325, y1 + 27), "Add client", fill=C["white"], font=font_small)
# Breadcrumb
d.text((main_x + 20, y1 + 90), "Clients  >  All clients", fill=C["gray5"], font=font_xs)
# Table hint
rounded_rect([main_x + 20, y1 + 130, main_x + col_w - 340, y1 + 280], fill=C["gray1"], radius=12)
d.text((main_x + 40, y1 + 190), "Table view with inline expansion,", fill=C["gray5"], font=font_reg)
d.text((main_x + 40, y1 + 215), "virtual scrolling, and cell editing", fill=C["gray5"], font=font_reg)
# Right-side dock demo
dock_x = main_x + col_w - 320
rounded_rect([dock_x, y1, dock_x + 320, y1 + h_nav], fill=C["white"])
d.rectangle([dock_x, y1, dock_x + 1, y1 + h_nav], fill=C["gray2"])
d.text((dock_x + 16, y1 + 16), "Acme Corporation", fill=C["black"], font=font_semibold)
d.text((dock_x + 16, y1 + 42), "GST: 27AABCU9603R1ZX", fill=C["gray5"], font=font_xs)
for i, tab in enumerate(["Overview", "Activity", "Tasks 3", "Notices"]):
    tx = dock_x + 16 + i * 72
    if i == 0:
        d.rectangle([tx, y1 + 80, tx + 65, y1 + 82], fill=C["teal"])
    d.text((tx, y1 + 65), tab, fill=C["teal"] if i == 0 else C["gray5"], font=font_xs)
# Inline editable fields
for i, (lbl, val) in enumerate([
    ("Primary contact", "Rahul Sharma (rahul@acme.in)"),
    ("Billing entity", "Acme Corp — Mumbai"),
    ("Team assigned", "AK  PS  +"),
]):
    yy = y1 + 130 + i * 70
    d.text((dock_x + 16, yy), lbl, fill=C["gray5"], font=font_xs)
    rounded_rect([dock_x + 16, yy + 18, dock_x + 288, yy + 50], fill=C["gray1"], radius=8)
    d.text((dock_x + 24, yy + 26), val, fill=C["black"], font=font_small)
# Dock footer buttons
rounded_rect([dock_x + 16, y1 + h_nav - 60, dock_x + 150, y1 + h_nav - 20], fill=C["teal"], radius=8)
d.text((dock_x + 50, y1 + h_nav - 48), "New task", fill=C["white"], font=font_small)
rounded_rect([dock_x + 160, y1 + h_nav - 60, dock_x + 288, y1 + h_nav - 20], fill=C["gray1"], radius=8)
d.text((dock_x + 195, y1 + h_nav - 48), "Message", fill=C["black"], font=font_small)
# Label
badge("NAVIGATION REVOLUTION", x1 + 16, y1 + h_nav - 36, C["teal_light"], C["teal"], font=font_xs, pad=6)


# --- Admin Mission Control ---
x2, y2 = M + col_w + G, cursor_y
rounded_rect([x2, y2, x2 + col_w, y2 + h_nav], fill=C["white"])
# Red alert banner
rounded_rect([x2, y2, x2 + col_w, y2 + 56], fill=C["red_light"], radius=0)
d.text((x2 + 16, y2 + 18), "⚠ 4 critical items need immediate attention  ·  GSTR-3B overdue for Swadeshi Bazaar (3 days)", fill=C["red"], font=font_small)
# Title
d.text((x2 + 16, y2 + 76), "Mission control", fill=C["black"], font=font_bold)
d.text((x2 + 16, y2 + 108), "Tuesday, 2 June 2026 — Here's what needs your focus today.", fill=C["gray5"], font=font_reg)
# Today column (left)
left_w = (col_w - 48) // 2
rounded_rect([x2 + 16, y2 + 150, x2 + 16 + left_w, y2 + h_nav - 20], fill=C["gray1"], radius=12)
d.text((x2 + 32, y2 + 168), "Today", fill=C["black"], font=font_semibold)
d.text((x2 + left_w - 20, y2 + 168), "8 items", fill=C["gray5"], font=font_xs)
for i, (title, sub, color) in enumerate([
    ("File GSTR-3B for Swadeshi Bazaar", "Overdue by 3 days · GST · Priya", C["red"]),
    ("Review TDS challan for Acme Corp", "Due today · TDS · You", C["amber"]),
    ("GST hearing prep — Notice 4452", "Hearing on 4 Jun · GST · Rahul", C["teal"]),
    ("Prepare payroll for May 2026", "Scheduled · Payroll · You", C["gray4"]),
    ("Approve leave request — Ankit K.", "3 days · Leave · Pending approval", C["gray4"]),
]):
    yy = y2 + 210 + i * 82
    rounded_rect([x2 + 32, yy, x2 + 36, yy + 48], fill=color, radius=2)
    d.text((x2 + 48, yy + 6), title, fill=C["black"], font=font_small)
    d.text((x2 + 48, yy + 28), sub, fill=C["gray5"], font=font_xs)
    if i == 4:
        badge("Approve", x2 + 48, yy + 46, C["emerald_light"], C["emerald"], font=font_xs, pad=4)
        badge("Review", x2 + 120, yy + 46, C["gray1"], C["gray5"], font=font_xs, pad=4)
# Monitor column (right)
mon_x = x2 + 32 + left_w
rounded_rect([mon_x, y2 + 150, x2 + col_w - 16, y2 + h_nav - 20], fill=C["white"])
# Metric cards
for i, (label, value, sub, has_bar) in enumerate([
    ("Team attendance", "92% present", "1 on leave · 1 WFH", False),
    ("Open queries", "12", "+3 since last week", False),
    ("Revenue MTD", "₹4,28,000", "↑ 12% vs last month", True),
]):
    yy = y2 + 150 + i * 130
    rounded_rect([mon_x, yy, x2 + col_w - 16, yy + 110], fill=C["gray1"], radius=12)
    d.text((mon_x + 12, yy + 12), label, fill=C["gray5"], font=font_xs)
    d.text((x2 + col_w - 40 - len(value) * 12, yy + 8), value, fill=C["black"], font=font_semibold)
    d.text((mon_x + 12, yy + 70), sub, fill=C["gray5"], font=font_xs)
    if has_bar:
        rounded_rect([mon_x + 12, yy + 90, x2 + col_w - 28, yy + 100], fill=C["gray2"], radius=4)
        rounded_rect([mon_x + 12, yy + 90, mon_x + 120, yy + 100], fill=C["teal"], radius=4)
# BizLens score card
yy = y2 + 150 + 3 * 130 + 10
rounded_rect([mon_x, yy, x2 + col_w - 16, yy + 80], fill=C["teal"], radius=12)
d.text((mon_x + 12, yy + 12), "Average BizLens score", fill=C["teal_med"], font=font_xs)
d.text((x2 + col_w - 80, yy + 8), "742", fill=C["white"], font=font_bold)
d.text((mon_x + 12, yy + 50), "Liquidity ↑  ·  Discipline →  ·  Structure ↑", fill=C["teal_med"], font=font_xs)
# Label
badge("ADMIN MISSION CONTROL", x2 + 16, y2 + h_nav - 36, C["teal_light"], C["teal"], font=font_xs, pad=6)


cursor_y += h_nav + G

# ========== ROW 2: TEAM DASHBOARD + UNIFIED INBOX ==========
h_row2 = 900

# --- Team "My Day" ---
x1, y1 = M, cursor_y
rounded_rect([x1, y1, x1 + col_w, y1 + h_row2], fill=C["white"])
d.text((x1 + 16, y1 + 20), "Good morning, Ankit", fill=C["black"], font=font_bold_l)
d.text((x1 + 16, y1 + 68), "You have 2 overdue tasks and 1 approval waiting.", fill=C["gray5"], font=font_reg)
# Quick action buttons
rounded_rect([x1 + col_w - 320, y1 + 20, x1 + col_w - 180, y1 + 52], fill=C["teal"], radius=8)
d.text((x1 + col_w - 305, y1 + 28), "Start timer", fill=C["white"], font=font_small)
rounded_rect([x1 + col_w - 170, y1 + 20, x1 + col_w - 16, y1 + 52], fill=C["gray1"], radius=8)
d.text((x1 + col_w - 155, y1 + 28), "Mark attendance", fill=C["black"], font=font_small)
# Stat cards
for i, (label, value, sub, color) in enumerate([
    ("Overdue", "2", "GSTR-3B filing, TDS challan review", C["red"]),
    ("Due today", "3", "Notice reply, client query, payroll", C["black"]),
    ("Pending approval", "1", "Ankit K. leave request (3 days)", C["amber"]),
]):
    cx = x1 + 16 + i * ((col_w - 48) // 3 + 12)
    cw = (col_w - 48) // 3
    rounded_rect([cx, y1 + 100, cx + cw, y1 + 200], fill=C["white"], radius=12)
    d.rectangle([cx, y1 + 100, cx + cw, y1 + 102], fill=C["gray2"])
    d.text((cx + 12, y1 + 116), label, fill=C["gray5"], font=font_xs)
    d.text((cx + 12, y1 + 140), value, fill=color, font=font_bold_l)
    d.text((cx + 12, y1 + 180), sub, fill=C["gray5"], font=font_xs)
# Work feed
rounded_rect([x1 + 16, y1 + 220, x1 + col_w - 16, y1 + h_row2 - 20], fill=C["gray1"], radius=12)
d.text((x1 + 32, y1 + 240), "My work feed", fill=C["black"], font=font_semibold)
for i, tab in enumerate(["All", "Tasks", "Queries", "Notices"]):
    tx = x1 + 140 + i * 60
    if i == 0:
        rounded_rect([tx, y1 + 236, tx + 40, y1 + 260], fill=C["teal_light"], radius=6)
        d.text((tx + 8, y1 + 242), tab, fill=C["teal"], font=font_xs)
    else:
        d.text((tx + 8, y1 + 242), tab, fill=C["gray5"], font=font_xs)
# Feed items
feed_items = [
    ("Today", C["red_light"], C["red"], "GSTR-3B filing overdue", "Overdue by 3 days · GST · High priority", "Open  ·  Snooze"),
    ("Today", C["teal_light"], C["teal"], "Reply to query from Krishi Rasayan", "Awaiting your reply · IT returns · 2 days", "Reply"),
    ("Tomorrow", C["amber_light"], C["amber"], "Review compliance calendar for June", "Due tomorrow · Compliance · 5 clients", "Open"),
]
for i, (group, bg, fg, title, sub, actions) in enumerate(feed_items):
    yy = y1 + 290 + i * 130
    if i == 0 or (i > 0 and feed_items[i-1][0] != group):
        rounded_rect([x1 + 16, yy - 6, x1 + col_w - 16, yy + 22], fill=bg, radius=0)
        d.text((x1 + 32, yy), group, fill=fg, font=font_xs)
        yy += 24
    rounded_rect([x1 + 32, yy, x1 + col_w - 32, yy + 90], fill=C["white"], radius=8)
    d.text((x1 + 48, yy + 12), title, fill=C["black"], font=font_small)
    d.text((x1 + 48, yy + 36), sub, fill=C["gray5"], font=font_xs)
    d.text((x1 + 48, yy + 62), actions, fill=C["teal"], font=font_xs)
# My clients strip
yy = y1 + h_row2 - 120
d.text((x1 + 32, yy), "My clients", fill=C["black"], font=font_semibold)
for i, (name, sub, abbr, abbr_col) in enumerate([
    ("Acme Corp", "1 task due today", "AC", C["teal"]),
    ("Swadeshi Bazaar", "2 overdue tasks", "SB", C["amber"]),
    ("Krishi Rasayan", "1 open query", "KR", C["purple"]),
]):
    cx = x1 + 32 + i * 220
    rounded_rect([cx, yy + 24, cx + 200, yy + 80], fill=C["white"], radius=10)
    rounded_rect([cx + 8, yy + 32, cx + 40, yy + 64], fill=abbr_col + "20", radius=6)
    d.text((cx + 14, yy + 40), abbr, fill=abbr_col, font=font_xs)
    d.text((cx + 48, yy + 34), name, fill=C["black"], font=font_small)
    d.text((cx + 48, yy + 54), sub, fill=C["gray5"], font=font_xs)
# Label
badge("TEAM 'MY DAY' DASHBOARD", x1 + 16, y1 + h_row2 - 36, C["teal_light"], C["teal"], font=font_xs, pad=6)


# --- Unified Inbox ---
x2, y2 = M + col_w + G, cursor_y
rounded_rect([x2, y2, x2 + col_w, y2 + h_row2], fill=C["white"])
d.text((x2 + 16, y2 + 20), "Inbox", fill=C["black"], font=font_bold)
d.text((x2 + 16, y2 + 52), "Everything that needs your attention in one place.", fill=C["gray5"], font=font_reg)
# Compose bar
rounded_rect([x2 + 16, y2 + 80, x2 + col_w - 16, y2 + 120], fill=C["gray1"], radius=8)
d.text((x2 + 32, y2 + 92), "Type /task, /query, or /notice to create...", fill=C["gray4"], font=font_reg)
# Feed
feed_data = [
    ("CRITICAL", C["red"], C["red_light"],
     "GSTR-3B filing overdue", "Task · Swadeshi Bazaar",
     "The GSTR-3B return for May 2026 was due on 20 May and is now 13 days overdue. Penalty risk: ₹5,000/day.",
     "Overdue 13 days · Assigned to Priya S. · GST Monthly", "Act"),
    ("ACTION REQUIRED", C["amber"], C["amber_light"],
     "Query reply needed — IT return clarification", "Query · Krishi Rasayan",
     "Client asked: 'Can we claim additional HRA exemption under the new regime?' Waiting since 30 May.",
     "Waiting 3 days · Last message from client", "Reply"),
    ("ACTION REQUIRED", C["amber"], C["amber_light"],
     "Leave approval request", "Approval · Ankit K.",
     "3 days leave requested (5–7 Jun). Reason: Family function. Team coverage: Priya S.",
     "Requested 2 hours ago · Your direct report", "Approve  ·  Reject"),
    ("UPCOMING", C["teal"], C["teal_light"],
     "GST hearing — Dept Notice 4452", "Hearing · Acme Corp",
     "Scheduled for 4 Jun at 11:00 AM at GST Bhavan, Mumbai. Carry DSC and authorization letter.",
     "In 2 days · Assigned to Rahul S.", "Prep"),
]
for i, (group, gcolor, gbg, title, meta, body, footer, actions) in enumerate(feed_data):
    yy = y2 + 140 + i * 170
    if i == 0 or feed_data[i-1][0] != group:
        rounded_rect([x2 + 16, yy - 4, x2 + col_w - 16, yy + 22], fill=gbg, radius=0)
        d.rectangle([x2 + 28, yy + 4, x2 + 32, yy + 12], fill=gcolor)
        d.text((x2 + 40, yy + 2), group, fill=gcolor, font=font_xs)
        yy += 24
    rounded_rect([x2 + 24, yy, x2 + col_w - 24, yy + 130], fill=C["white"], radius=8)
    d.rectangle([x2 + 24, yy, x2 + col_w - 24, yy + 1], fill=C["gray2"])
    d.text((x2 + 40, yy + 12), title, fill=C["black"], font=font_semibold)
    badge(meta.split(" · ")[0], x2 + 40 + d.textbbox((0,0), title, font=font_semibold)[2] + 10, yy + 10, gbg, gcolor, font=font_xs, pad=3)
    d.text((x2 + 40, yy + 38), body[:90] + "...", fill=C["gray5"], font=font_reg)
    d.text((x2 + 40, yy + 68), footer, fill=C["gray4"], font=font_xs)
    # Actions
    badge(actions.split("  · ")[0], x2 + col_w - 120, yy + 100, C["teal_light"], C["teal"], font=font_xs, pad=4)
# Label
badge("UNIFIED INBOX", x2 + 16, y2 + h_row2 - 36, C["teal_light"], C["teal"], font=font_xs, pad=6)


cursor_y += h_row2 + G

# ========== ROW 3: KANBAN + SMART TABLE ==========
h_row3 = 900

# --- Kanban Board ---
x1, y1 = M, cursor_y
rounded_rect([x1, y1, x1 + col_w, y1 + h_row3], fill=C["white"])
d.text((x1 + 16, y1 + 16), "Tasks", fill=C["black"], font=font_bold)
# View toggle
for i, tab in enumerate(["List", "Board", "Calendar"]):
    tx = x1 + 80 + i * 60
    if i == 1:
        rounded_rect([tx, y1 + 14, tx + 50, y1 + 38], fill=C["white"], radius=6)
        d.text((tx + 8, y1 + 20), tab, fill=C["black"], font=font_xs)
    else:
        d.text((tx + 8, y1 + 20), tab, fill=C["gray5"], font=font_xs)
rounded_rect([x1 + col_w - 140, y1 + 12, x1 + col_w - 16, y1 + 44], fill=C["teal"], radius=8)
d.text((x1 + col_w - 120, y1 + 20), "New task", fill=C["white"], font=font_small)

# Columns
col_width = (col_w - 56) // 4
for ci, (name, count, dot_color) in enumerate([
    ("To do", "5", C["gray4"]),
    ("In progress", "3", C["teal"]),
    ("Pending review", "2", C["amber"]),
    ("Completed", "8", C["emerald"]),
]):
    cx = x1 + 16 + ci * (col_width + 12)
    rounded_rect([cx, y1 + 60, cx + col_width, y1 + h_row3 - 20], fill=C["gray1"], radius=12)
    d.text((cx + 12, y1 + 76), name, fill=C["gray5"], font=font_semibold)
    d.rectangle([cx + 12 + d.textbbox((0,0), name, font=font_semibold)[2] + 8, y1 + 78, cx + 12 + d.textbbox((0,0), name, font=font_semibold)[2] + 16, y1 + 86], fill=dot_color)
    d.text((cx + col_width - 28, y1 + 76), count, fill=C["gray5"], font=font_xs)

    cards = [
        [("GST", C["teal"]), "File GSTR-1 for Acme Corp", "Monthly outward supplies return", "AK", "2 Jun", C["red"], "High"],
        [("TDS", C["amber"]), "Q1 TDS challan verification", "Cross-check Form 26AS", "PS", "4 Jun", C["gray4"], "Medium"],
        [("IT", C["purple"]), "Advance tax computation", "Q1 advance tax for 3 clients", "RS", "10 Jun", C["gray4"], "Low"],
    ] if ci == 0 else [
        [("GST", C["teal"]), "Respond to GST notice 4452", "Prepare written submission", "AK", "Due 4 Jun", None, None],
        [("BizLens", C["gray5"]), "Prepare Q1 BizLens report", "", "PS", "Due 15 Jun", None, None],
    ] if ci == 1 else [
        [("TDS", C["amber"]), "TDS return filing — Krishi", "Awaiting partner sign-off", "RS", "Submitted 1 Jun", None, None],
    ] if ci == 2 else [
        [("", None), "May payroll finalized", "", "", "Completed by Ankit · 1 Jun", None, None],
        [("", None), "GST registration — Swadeshi", "", "", "Completed by Priya · 28 May", None, None],
    ]
    for ri, (tag, title, body, assignee, due, pri_col, pri) in enumerate(cards):
        cy = y1 + 110 + ri * 120
        rounded_rect([cx + 8, cy, cx + col_width - 8, cy + 110], fill=C["white"], radius=8)
        if tag[1]:
            badge(tag[0], cx + 16, cy + 10, tag[1] + "15", tag[1], font=font_xs, pad=3)
        d.text((cx + 16, cy + 34), title, fill=C["black"], font=font_small)
        if body:
            d.text((cx + 16, cy + 56), body[:35] + "...", fill=C["gray5"], font=font_xs)
        if assignee:
            rounded_rect([cx + 16, cy + 80, cx + 40, cy + 100], fill=C["teal"], radius=10)
            d.text((cx + 22, cy + 84), assignee[:2], fill=C["white"], font=font_xs)
            d.text((cx + 48, cy + 84), due, fill=C["gray5"], font=font_xs)
        if pri:
            badge(pri, cx + col_width - 60, cy + 80, pri_col + "15", pri_col, font=font_xs, pad=3)
    # Inline add
    cy = y1 + 110 + len(cards) * 120 + 10
    rounded_rect([cx + 8, cy, cx + col_width - 8, cy + 36], fill=C["white"], radius=8)
    d.rectangle([cx + 8, cy, cx + col_width - 8, cy + 36], outline=C["gray3"], width=1)
    d.text((cx + 16, cy + 10), "+ Add task...", fill=C["gray4"], font=font_reg)
# Label
badge("KANBAN BOARD (inline creation)", x1 + 16, y1 + h_row3 - 36, C["teal_light"], C["teal"], font=font_xs, pad=6)


# --- Smart Table ---
x2, y2 = M + col_w + G, cursor_y
rounded_rect([x2, y2, x2 + col_w, y2 + h_row3], fill=C["white"])
d.text((x2 + 16, y2 + 16), "Clients", fill=C["black"], font=font_bold)
d.text((x2 + 16, y2 + 48), "42 active clients", fill=C["gray5"], font=font_reg)
# Density toggle
for i, tab in enumerate(["Comfortable", "Compact", "Gallery"]):
    tx = x2 + col_w - 280 + i * 90
    if i == 0:
        rounded_rect([tx, y2 + 16, tx + 90, y2 + 40], fill=C["gray1"], radius=6)
    d.text((tx + 8, y2 + 22), tab, fill=C["black"] if i == 0 else C["gray5"], font=font_xs)
# Table header
hh = y2 + 80
rounded_rect([x2 + 16, hh, x2 + col_w - 16, hh + 36], fill=C["gray1"], radius=0)
headers = ["", "Client", "Services", "Compliance", "Open work", "Team", "Status"]
hx = x2 + 24
for h in headers:
    d.text((hx, hh + 10), h, fill=C["gray5"], font=font_xs)
    hx += 90 if h == "" else 160 if h == "Client" else 100

# Rows
rows = [
    ("AC", C["teal"], "Acme Corporation Pvt Ltd", "27AABCU9603R1ZX", ["GST", "TDS"], [C["emerald"], C["emerald"], C["emerald"]], "3 tasks, 1 query", ["AK", C["teal"], "PS", C["amber"]], "Active", C["emerald"]),
    ("SB", C["amber"], "Swadeshi Bazaar LLP", "27AAICS1234R1Z5", ["GST", "IT"], [C["red"], C["emerald"], C["emerald"]], "5 tasks, 2 notices", ["RS", C["purple"]], "Active", C["emerald"]),
    ("KR", C["purple"], "Krishi Rasayan Exports", "27AABCK5678L1Z9", ["GST", "TDS", "IT"], [C["emerald"], C["emerald"], C["emerald"]], "2 tasks", ["AK", C["teal"]], "Active", C["emerald"]),
]
for ri, (abbr, abbr_col, name, gst, services, comp_dots, work, team, status, status_col) in enumerate(rows):
    ry = hh + 40 + ri * 70
    if ri == 1:
        rounded_rect([x2 + 16, ry, x2 + col_w - 16, ry + 220], fill=C["teal"] + "08", radius=0)
    rounded_rect([x2 + 16, ry, x2 + col_w - 16, ry + 64], fill=C["white"] if ri != 1 else C["teal"] + "08", radius=0)
    d.rectangle([x2 + 16, ry + 63, x2 + col_w - 16, ry + 64], fill=C["gray2"])
    # Checkbox
    rounded_rect([x2 + 28, ry + 22, x2 + 44, ry + 38], outline=C["gray3"], radius=4)
    # Avatar
    rounded_rect([x2 + 56, ry + 16, x2 + 88, ry + 48], fill=abbr_col + "20", radius=8)
    d.text((x2 + 64, ry + 24), abbr, fill=abbr_col, font=font_xs)
    # Name
    d.text((x2 + 96, ry + 14), name, fill=C["black"], font=font_small)
    d.text((x2 + 96, ry + 34), gst, fill=C["gray5"], font=font_xs)
    # Services
    sx = x2 + 260
    for svc, sc in zip(services, [C["teal"], C["amber"], C["purple"]]):
        badge(svc, sx, ry + 20, sc + "15", sc, font=font_xs, pad=3)
        sx += 45
    # Compliance dots
    dx = x2 + 370
    for cd in comp_dots:
        rounded_rect([dx, ry + 24, dx + 16, ry + 40], fill=cd + "20", radius=8)
        rounded_rect([dx + 5, ry + 29, dx + 11, ry + 35], fill=cd, radius=3)
        dx += 22
    # Work
    d.text((x2 + 450, ry + 24), work, fill=C["black"], font=font_small)
    # Team
    tx = x2 + 560
    for ti, (tinit, tcol) in enumerate(zip(team[::2], team[1::2])):
        rounded_rect([tx + ti * 22, ry + 20, tx + ti * 22 + 24, ry + 44], fill=tcol, radius=10)
        d.text((tx + ti * 22 + 6, ry + 26), tinit[:2], fill=C["white"], font=font_xs)
    # Status
    badge(status, x2 + col_w - 110, ry + 20, status_col + "15", status_col, font=font_xs, pad=4)

    # Expanded detail for row 2 (Swadeshi Bazaar)
    if ri == 1:
        ey = ry + 70
        rounded_rect([x2 + 56, ey, x2 + col_w - 56, ey + 130], fill=C["white"], radius=8)
        # 3 columns inside expansion
        cols = [
            ("Overdue tasks", ["• GSTR-3B filing (13 days)", "• Input reconciliation (5 days)"]),
            ("Open notices", ["• GST Dept notice 4452 — hearing 4 Jun"]),
            ("Quick actions", ["[New task]  [Message]  [View portal]"]),
        ]
        for ci, (clbl, citems) in enumerate(cols):
            cx = x2 + 72 + ci * 290
            d.text((cx, ey + 12), clbl, fill=C["gray5"], font=font_xs)
            for ii, item in enumerate(citems):
                d.text((cx, ey + 36 + ii * 22), item, fill=C["black"] if "[" not in item else C["teal"], font=font_small if "[" not in item else font_xs)
# Label
badge("SMART TABLE (row expansion)", x2 + 16, y2 + h_row3 - 36, C["teal_light"], C["teal"], font=font_xs, pad=6)


cursor_y += h_row3 + G

# ========== ROW 4: MOBILE + DETAIL DOCK + HOVERCARD ==========
h_row4 = 900
third_w = (col_w * 2 + G - 24) // 3

# --- Mobile View ---
x1, y1 = M, cursor_y
rounded_rect([x1, y1, x1 + third_w, y1 + h_row4], fill=C["white"])
# Phone frame
phone_x, phone_y = x1 + (third_w - 320) // 2, y1 + 40
rounded_rect([phone_x - 8, phone_y - 8, phone_x + 328, phone_y + 712], fill=C["black"], radius=24)
rounded_rect([phone_x, phone_y, phone_x + 320, phone_y + 700], fill=C["bg"], radius=16)
# Mobile header
rounded_rect([phone_x, phone_y, phone_x + 320, phone_y + 56], fill=C["white"], radius=16)
d.rectangle([phone_x, phone_y + 44, phone_x + 320, phone_y + 56], fill=C["gray2"])
rounded_rect([phone_x + 12, phone_y + 14, phone_x + 44, phone_y + 42], fill=C["teal"], radius=8)
d.text((phone_x + 20, phone_y + 20), "FF", fill=C["white"], font=font_xs)
d.text((phone_x + 52, phone_y + 20), "My day", fill=C["black"], font=font_semibold)
# Stats
for i, (val, lbl) in enumerate([("2", "Overdue"), ("3", "Today"), ("1", "Approval")]):
    sx = phone_x + 12 + i * 104
    rounded_rect([sx, phone_y + 68, sx + 96, phone_y + 136], fill=C["white"], radius=10)
    d.text((sx + 36, phone_y + 78), val, fill=C["red"] if i == 0 else C["black"] if i == 1 else C["amber"], font=font_bold)
    d.text((sx + 28, phone_y + 114), lbl, fill=C["gray5"], font=font_xs)
# Cards
for i, (title, sub, color, btn1, btn2) in enumerate([
    ("GSTR-3B filing", "Swadeshi Bazaar · GST · Due 20 May", C["red"], "Open", "Snooze"),
    ("Reply to query", "Krishi Rasayan · IT returns", C["teal"], "Reply", "View"),
    ("Approve leave", "Ankit K. · 3 days · Family function", C["amber"], "Approve", "Review"),
]):
    cy = phone_y + 152 + i * 130
    rounded_rect([phone_x + 12, cy, phone_x + 308, cy + 120], fill=C["white"], radius=12)
    rounded_rect([phone_x + 20, cy + 12, phone_x + 52, cy + 44], fill=color + "15", radius=8)
    d.text((phone_x + 24, cy + 20), "!" if color == C["red"] else "✎" if color == C["teal"] else "✓", fill=color, font=font_reg)
    d.text((phone_x + 60, cy + 12), title, fill=C["black"], font=font_small)
    d.text((phone_x + 60, cy + 34), sub, fill=C["gray5"], font=font_xs)
    rounded_rect([phone_x + 60, cy + 62, phone_x + 120, cy + 88], fill=color, radius=6)
    d.text((phone_x + 70, cy + 68), btn1, fill=C["white"], font=font_xs)
    rounded_rect([phone_x + 128, cy + 62, phone_x + 190, cy + 88], fill=C["gray1"], radius=6)
    d.text((phone_x + 138, cy + 68), btn2, fill=C["gray5"], font=font_xs)
# FAB
rounded_rect([phone_x + 240, phone_y + 620, phone_x + 296, phone_y + 676], fill=C["teal"], radius=28)
d.text((phone_x + 260, phone_y + 636), "+", fill=C["white"], font=font_bold_l)
# Bottom nav
rounded_rect([phone_x, phone_y + 644, phone_x + 320, phone_y + 700], fill=C["white"], radius=16)
for i, icon in enumerate(["◆", "□", "○", "☺"]):
    ix = phone_x + 32 + i * 72
    d.text((ix, phone_y + 658), icon, fill=C["teal"] if i == 0 else C["gray4"], font=font_reg)
# Label
badge("MOBILE EXPERIENCE", x1 + 16, y1 + h_row4 - 36, C["teal_light"], C["teal"], font=font_xs, pad=6)


# --- Detail Dock Pattern ---
x2, y2 = M + third_w + 12, cursor_y
rounded_rect([x2, y2, x2 + third_w, y2 + h_row4], fill=C["white"])
d.text((x2 + 16, y2 + 16), "Right-Side Detail Dock", fill=C["black"], font=font_bold)
d.text((x2 + 16, y2 + 48), "Slides over list view · Stacks · Inline editing · Pop out", fill=C["gray5"], font=font_reg)

# Demo: list on left, dock on right
list_w = third_w // 2 - 20
rounded_rect([x2 + 16, y2 + 80, x2 + 16 + list_w, y2 + h_row4 - 20], fill=C["gray1"], radius=12)
d.text((x2 + 28, y2 + 96), "Tasks", fill=C["black"], font=font_semibold)
for i, title in enumerate([
    "File GSTR-3B for Swadeshi Bazaar",
    "Review TDS challan for Acme Corp",
    "GST hearing prep — Notice 4452",
    "Prepare payroll for May 2026",
]):
    ly = y2 + 130 + i * 70
    rounded_rect([x2 + 28, ly, x2 + 16 + list_w - 12, ly + 58], fill=C["white"], radius=8)
    d.text((x2 + 40, ly + 10), title, fill=C["black"], font=font_small)
    d.text((x2 + 40, ly + 32), "Due 2 Jun · GST", fill=C["gray5"], font=font_xs)
    if i == 0:
        rounded_rect([x2 + 28, ly, x2 + 16 + list_w - 12, ly + 58], outline=C["teal"], radius=8)
        d.rectangle([x2 + 28, ly + 4, x2 + 30, ly + 54], fill=C["teal"])

# Dock
dock_x = x2 + 16 + list_w + 16
dock_w = third_w - list_w - 48
rounded_rect([dock_x, y2 + 80, dock_x + dock_w, y2 + h_row4 - 20], fill=C["white"], radius=12)
d.rectangle([dock_x, y2 + 80, dock_x + 1, y2 + h_row4 - 20], fill=C["gray2"])
# Dock header
d.text((dock_x + 12, y2 + 96), "Acme Corporation", fill=C["black"], font=font_semibold)
d.text((dock_x + 12, y2 + 120), "GST: 27AABCU9603R1ZX", fill=C["gray5"], font=font_xs)
d.text((dock_x + dock_w - 28, y2 + 96), "×", fill=C["gray4"], font=font_semibold)
# Tabs
for i, tab in enumerate(["Overview", "Activity", "Tasks 3", "Notices"]):
    tx = dock_x + 12 + i * 70
    if i == 0:
        d.rectangle([tx, y2 + 152, tx + 60, y2 + 154], fill=C["teal"])
    d.text((tx, y2 + 138), tab, fill=C["teal"] if i == 0 else C["gray5"], font=font_xs)
# Fields
for i, (flbl, fval) in enumerate([
    ("Primary contact", "Rahul Sharma (rahul@acme.in)"),
    ("Billing entity", "Acme Corp — Mumbai"),
    ("Team assigned", "AK  PS  +"),
]):
    fy = y2 + 180 + i * 80
    d.text((dock_x + 12, fy), flbl, fill=C["gray5"], font=font_xs)
    rounded_rect([dock_x + 12, fy + 18, dock_x + dock_w - 12, fy + 50], fill=C["gray1"], radius=6)
    d.text((dock_x + 20, fy + 26), fval, fill=C["black"], font=font_small)
# Footer buttons
rounded_rect([dock_x + 12, y2 + h_row4 - 80, dock_x + dock_w // 2 - 6, y2 + h_row4 - 44], fill=C["teal"], radius=8)
d.text((dock_x + dock_w // 4 - 20, y2 + h_row4 - 68), "New task", fill=C["white"], font=font_small)
rounded_rect([dock_x + dock_w // 2 + 6, y2 + h_row4 - 80, dock_x + dock_w - 12, y2 + h_row4 - 44], fill=C["gray1"], radius=8)
d.text((dock_x + dock_w // 2 + 30, y2 + h_row4 - 68), "Message", fill=C["black"], font=font_small)
# Stack indicator
d.text((dock_x + 12, y2 + h_row4 - 110), "← Clients  ·  Acme Corp", fill=C["teal"], font=font_xs)
# Label
badge("DETAIL DOCK PATTERN", x2 + 16, y2 + h_row4 - 36, C["teal_light"], C["teal"], font=font_xs, pad=6)


# --- Hovercard Concept ---
x3, y3 = M + third_w * 2 + 24, cursor_y
rounded_rect([x3, y3, x3 + third_w, y3 + h_row4], fill=C["white"])
d.text((x3 + 16, y3 + 16), "Zero-Click Previews", fill=C["black"], font=font_bold)
d.text((x3 + 16, y3 + 48), "Hover any link → instant preview without clicking", fill=C["gray5"], font=font_reg)

# Mock list with hovercard popup
rounded_rect([x3 + 16, y3 + 90, x3 + third_w - 16, y3 + 320], fill=C["gray1"], radius=12)
d.text((x3 + 28, y3 + 106), "Recent tasks", fill=C["black"], font=font_semibold)
for i, title in enumerate([
    "File GSTR-3B for Swadeshi Bazaar",
    "Review TDS challan for Acme Corp",
    "GST hearing prep — Notice 4452",
]):
    ty = y3 + 140 + i * 60
    rounded_rect([x3 + 28, ty, x3 + third_w - 28, ty + 50], fill=C["white"], radius=8)
    d.text((x3 + 40, ty + 10), title, fill=C["black"], font=font_small)
    d.text((x3 + 40, ty + 30), "Due 2 Jun · GST · High priority", fill=C["gray5"], font=font_xs)
    if i == 1:
        # Highlighted row
        rounded_rect([x3 + 28, ty, x3 + third_w - 28, ty + 50], outline=C["teal"], radius=8)
        # Hovercard
        hx, hy = x3 + 120, ty - 180
        rounded_rect([hx, hy, hx + 260, hy + 170], fill=C["white"], radius=12)
        d.rectangle([hx, hy, hx + 260, hy + 1], fill=C["gray2"])
        # Card content
        d.text((hx + 12, hy + 12), "Acme Corp", fill=C["black"], font=font_semibold)
        d.text((hx + 12, hy + 36), "Compliance score: 92/100", fill=C["gray5"], font=font_xs)
        # Mini stats
        rounded_rect([hx + 12, hy + 60, hx + 80, hy + 90], fill=C["teal_light"], radius=6)
        d.text((hx + 18, hy + 66), "3 tasks", fill=C["teal"], font=font_xs)
        rounded_rect([hx + 88, hy + 60, hx + 160, hy + 90], fill=C["amber_light"], radius=6)
        d.text((hx + 94, hy + 66), "1 query", fill=C["amber"], font=font_xs)
        rounded_rect([hx + 168, hy + 60, hx + 244, hy + 90], fill=C["emerald_light"], radius=6)
        d.text((hx + 174, hy + 66), "0 notices", fill=C["emerald"], font=font_xs)
        # Contact
        d.text((hx + 12, hy + 106), "Rahul Sharma · rahul@acme.in", fill=C["gray5"], font=font_xs)
        # Quick actions
        rounded_rect([hx + 12, hy + 130, hx + 110, hy + 156], fill=C["teal"], radius=6)
        d.text((hx + 28, hy + 136), "New task", fill=C["white"], font=font_xs)
        rounded_rect([hx + 118, hy + 130, hx + 200, hy + 156], fill=C["gray1"], radius=6)
        d.text((hx + 130, hy + 136), "Message", fill=C["black"], font=font_xs)
        # Pointer
        d.polygon([(hx + 60, hy + 170), (hx + 50, hy + 180), (hx + 70, hy + 180)], fill=C["white"])
        d.line([(hx + 50, hy + 180), (hx + 70, hy + 180)], fill=C["gray2"])

# Keyboard shortcuts legend
rounded_rect([x3 + 16, y3 + 340, x3 + third_w - 16, y3 + h_row4 - 20], fill=C["gray1"], radius=12)
d.text((x3 + 28, y3 + 358), "Keyboard shortcuts", fill=C["black"], font=font_semibold)
shortcuts = [
    ("Cmd + K", "Command Center"),
    ("j / k", "Navigate items"),
    ("e", "Expand row"),
    ("a", "Act on item"),
    ("c", "Create new"),
    ("?", "Show shortcuts"),
    ("Esc", "Close any modal"),
]
for i, (key, action) in enumerate(shortcuts):
    sy = y3 + 390 + i * 36
    rounded_rect([x3 + 28, sy, x3 + 100, sy + 24], fill=C["white"], radius=4)
    d.text((x3 + 36, sy + 5), key, fill=C["black"], font=font_xs)
    d.text((x3 + 110, sy + 5), action, fill=C["gray5"], font=font_reg)
# Label
badge("ZERO-CLICK PREVIEWS", x3 + 16, y3 + h_row4 - 36, C["teal_light"], C["teal"], font=font_xs, pad=6)


cursor_y += h_row4 + G

# ========== FOOTER ==========
d.rectangle([0, H - 80, W, H], fill=C["white"])
d.text((M, H - 50), "Generated design board · Open individual HTML files in /design-proposals/ for interactive versions", fill=C["gray5"], font=font_reg)

# Save
out_path = "UX_REVOLUTION_BOARD.png"
img.save(out_path, "PNG", dpi=(150, 150))
print(f"Saved design board to {out_path} ({W}x{H}px)")
