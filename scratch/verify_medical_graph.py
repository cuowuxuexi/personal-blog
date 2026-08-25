from pathlib import Path
import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from urllib.parse import quote

BASE = "http://127.0.0.1:4174"
OUT = Path("scratch/medical-graph-verification")
OUT.mkdir(parents=True, exist_ok=True)

ROUTES = [
    ("industry", "/投资/投研/医药/", "医药行业"),
    ("graph", "/投资/投研/医药/研究地图/", "医药知识图谱"),
    ("process", "/投资/投研/医药/研究地图/创新药研发全流程/", "创新药研发全流程"),
    ("cxo", "/投资/投研/医药/研究地图/CXO与CRDMO/", "CXO 与 CRDMO"),
    ("payment", "/投资/投研/医药/研究地图/原研仿制与支付端/", "原研、仿制与支付端"),
    ("wuxi", "/投资/投研/医药/药明康德/", "药明康德"),
]

VIEWPORTS = {
    "desktop": (1440, 1000),
    "mobile": (390, 844),
}

options = Options()
options.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
options.add_argument("--headless=new")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--force-device-scale-factor=1")
options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

driver = webdriver.Chrome(options=options)
wait = WebDriverWait(driver, 10)
results = {"routes": [], "clicks": [], "errors": []}


def current_h1():
    headings = [el.text.strip() for el in driver.find_elements(By.TAG_NAME, "h1") if el.text.strip()]
    return headings[-1] if headings else ""


def load(path, expected_h1):
    print(f"LOAD {path} -> {expected_h1}", flush=True)
    driver.get(BASE + quote(path, safe="/#"))
    wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
    wait.until(lambda d: current_h1() == expected_h1)
    return current_h1()


def page_metrics():
    return driver.execute_script(
        """
        return {
          viewportWidth: window.innerWidth,
          pageScrollWidth: document.documentElement.scrollWidth,
          pageClientWidth: document.documentElement.clientWidth,
          graphNodes: document.querySelectorAll('.knowledge-node').length,
          brokenCustomBoxes: [...document.querySelectorAll('.knowledge-graph, .dual-track-map, .role-span-map, .modality-matrix, .company-node-map')]
            .filter(el => el.getBoundingClientRect().width < 1 || el.getBoundingClientRect().height < 1).length,
          internalScrollers: [...document.querySelectorAll('.dual-track-map, .role-span-map, .modality-matrix')]
            .filter(el => el.scrollWidth > el.clientWidth + 1).length
        };
        """
    )


def browser_errors():
    errors = []
    for entry in driver.get_log("browser"):
        if entry.get("level") == "SEVERE" and "favicon" not in entry.get("message", "").lower():
            errors.append(entry)
    return errors

try:
    for viewport, (width, height) in VIEWPORTS.items():
        driver.set_window_size(width, height)
        for slug, route, expected_h1 in ROUTES:
            actual_h1 = load(route, expected_h1)
            metrics = page_metrics()
            overflow = metrics["pageScrollWidth"] > metrics["pageClientWidth"] + 2
            if overflow:
                raise AssertionError(f"Page overflow at {viewport} {route}: {metrics}")
            if metrics["brokenCustomBoxes"]:
                raise AssertionError(f"Invisible graph container at {viewport} {route}: {metrics}")
            logs = browser_errors()
            if logs:
                results["errors"].extend(logs)
                raise AssertionError(f"Browser errors at {viewport} {route}: {logs}")
            driver.save_screenshot(str(OUT / f"{viewport}-{slug}.png"))
            results["routes"].append({
                "viewport": viewport,
                "route": route,
                "h1": actual_h1,
                "metrics": metrics,
            })

    driver.set_window_size(*VIEWPORTS["desktop"])

    load("/投资/投研/医药/研究地图/", "医药知识图谱")
    driver.execute_script("document.querySelector('a[href=\"/投资/投研/医药/研究地图/原研仿制与支付端/#identity\"]').click()")
    wait.until(lambda d: current_h1() == "原研、仿制与支付端")
    wait.until(lambda d: d.execute_script("return location.hash") == "#identity")
    results["clicks"].append({"from": "graph", "to": "payment#identity", "ok": True})

    load("/投资/投研/医药/研究地图/", "医药知识图谱")
    driver.execute_script("document.querySelector('a[href=\"/投资/投研/医药/药明康德/#company-map\"]').click()")
    wait.until(lambda d: current_h1() == "药明康德")
    wait.until(lambda d: d.execute_script("return location.hash") == "#company-map")
    results["clicks"].append({"from": "graph", "to": "wuxi#company-map", "ok": True})

    load("/投资/投研/医药/", "医药行业")
    driver.execute_script("document.querySelector('a[href=\"/投资/投研/医药/研究地图/CXO与CRDMO/\"]').click()")
    wait.until(lambda d: current_h1() == "CXO 与 CRDMO")
    results["clicks"].append({"from": "industry", "to": "cxo", "ok": True})

    load("/投资/投研/医药/研究地图/创新药研发全流程/", "创新药研发全流程")
    driver.execute_script("document.querySelector('a[href=\"/投资/投研/医药/药明康德/#company-map\"]').click()")
    wait.until(lambda d: current_h1() == "药明康德")
    results["clicks"].append({"from": "process", "to": "wuxi", "ok": True})

    load("/投资/投研/医药/研究地图/原研仿制与支付端/", "原研、仿制与支付端")
    driver.execute_script("document.querySelector('a[href=\"/投资/投研/医药/研究地图/CXO与CRDMO/#roles\"]').click()")
    wait.until(lambda d: current_h1() == "CXO 与 CRDMO")
    wait.until(lambda d: d.execute_script("return location.hash") == "#roles")
    results["clicks"].append({"from": "payment", "to": "cxo#roles", "ok": True})

finally:
    driver.quit()

(OUT / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(results, ensure_ascii=False, indent=2))
