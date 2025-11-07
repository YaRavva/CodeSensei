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
        # -> Click on the 'Зарегистрироваться' link to go to the registration page.
        frame = context.pages[-1]
        # Click on the 'Зарегистрироваться' link to navigate to the registration page
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/p/a').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Fill in the registration form with email 'ravva@bk.ru', password 'klk12cfw', and full name 'Иванов Иван'.
        frame = context.pages[-1]
        # Input email address
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('ravva@bk.ru')
        

        frame = context.pages[-1]
        # Input password
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/div[2]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('klk12cfw')
        

        frame = context.pages[-1]
        # Input full name
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/div[2]/div[3]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('Иванов Иван')
        

        # -> Submit the registration form by clicking the 'Зарегистрироваться' button.
        frame = context.pages[-1]
        # Click the 'Зарегистрироваться' button to submit the registration form
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Input email 'ravva@bk.ru' and password 'klk12cfw' to login and verify user role and redirection.
        frame = context.pages[-1]
        # Input email for login
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('ravva@bk.ru')
        

        frame = context.pages[-1]
        # Input password for login
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/div[2]/div[2]/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('klk12cfw')
        

        frame = context.pages[-1]
        # Click 'Войти' button to submit login form
        elem = frame.locator('xpath=html/body/div[2]/div/main/div/div/div/div/div/form/div/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # -> Verify that the user's role is set correctly by checking for role-specific UI elements or access, such as presence or absence of 'Админ-панель' link for admin role.
        frame = context.pages[-1]
        # Check 'Админ-панель' link to verify if user has admin role access
        elem = frame.locator('xpath=html/body/div[2]/div/nav/div/div/a[4]').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        

        # --> Assertions to verify final state
        frame = context.pages[-1]
        await expect(frame.locator('text=Админ-панель').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Управление модулями').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Создать модуль').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Кортежи').first).to_be_visible(timeout=30000)
        await expect(frame.locator('text=Опубликован').first).to_be_visible(timeout=30000)
        await asyncio.sleep(5)
    
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()
            
asyncio.run(run_test())
    