import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None
    
    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()
        
        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )
        
        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)
        
        # Open a new page in the browser context
        page = await context.new_page()
        
        # Navigate to your target URL and wait until the network request is committed
        await page.goto("http://localhost:3000", wait_until="commit", timeout=10000)
        
        # Wait for the main page to reach DOMContentLoaded state (optional for stability)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=3000)
        except async_api.Error:
            pass
        
        # Iterate through all iframes and wait for them to load as well
        for frame in page.frames:
            try:
                await frame.wait_for_load_state("domcontentloaded", timeout=3000)
            except async_api.Error:
                pass
        
        # Interact with the page elements to simulate user flow
        # -> Input email and password, then click login button to authenticate.
        frame = context.pages[-1]
        # Input email address
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('ravva@bk.ru')
        

        frame = context.pages[-1]
        # Input password
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/div[2]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('klk12cfw')
        

        frame = context.pages[-1]
        # Click login button to submit credentials
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click on a module to start or continue and submit a Python code solution for evaluation.
        frame = context.pages[-1]
        # Click 'Начать изучение' for 'Переменные и типы данных' module to start learning and access tasks
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div[2]/div/div[2]/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Open a completed task to review or resubmit code and verify AI evaluation feedback with detailed correctness, suggestions, and explanation.
        frame = context.pages[-1]
        # Open the last task 'Задание 0 Кортежи: Сортировка и Фильтр' to review or resubmit code and check AI evaluation feedback
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div[5]/div/div[3]/div/h3/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Click the 'Проверить задание' button to submit the code solution and trigger AI evaluation feedback.
        frame = context.pages[-1]
        # Click 'Проверить задание' button to submit code for AI evaluation
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div[5]/div/div[3]/div/div/div/div/div[2]/div[2]/div[2]/button[2]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Все тесты пройдены!').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Функция корректно реализует требуемую сортировку: использует стабильный sorted с ключом по оценке и reverse=True, поэтому при одинаковых оценках сохраняется исходный порядок. Возвращает кортеж только имен, как и требуется. Код простой и читаемый, с понятными комментариями и явными типами. Решение покрывает все крайние случаи, включая пустой кортеж, отрицательные оценки и дублирующиеся имена.').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    