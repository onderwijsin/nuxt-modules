export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server && to.path === "/server-auth") {
    const auth = useDirectusAuth();
    await auth.login({ email: "user@example.test", password: "password" });
    await auth.passwordRequest("user@example.test");
    await auth.passwordReset("reset-token", "new-password");
    await auth.requestMagicLink("user@example.test");
    await auth.redeemMagicLink("raw-token", "123456");
    await auth.logout();
  }

  if (import.meta.server && to.path === "/server-auth-refresh") {
    try {
      await useDirectusAuth().refresh();
    } catch (error) {
      if (
        !(error && typeof error === "object" && "statusCode" in error && error.statusCode === 401)
      )
        throw error;
    }
  }
});
