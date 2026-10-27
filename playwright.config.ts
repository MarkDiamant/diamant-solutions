import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
 testDir:"./tests/e2e",
 timeout:90000,
 expect:{timeout:15000},
 retries:0,
 workers:1,
 reporter:"list",
 use:{baseURL:process.env.BMS_TEST_BASE_URL||"https://bms.diamantsolutions.co.uk",trace:"off",screenshot:"off",...devices["Desktop Chrome"]},
 projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
});
