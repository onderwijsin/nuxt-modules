export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server && to.path === "/redeem") {
    await useDirectusAuth().redeemMagicLink("raw-token", "123456");
  }
});
