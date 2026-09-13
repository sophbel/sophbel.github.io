{
  description = "Development shell for the Belman Lab site";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            # Astro builds here and in CI. Node 24 strips TypeScript natively,
            # which is what lets scripts/ run as .ts with no build step.
            pkgs.nodejs_24

            # Must match `packageManager` in package.json *exactly*. pnpm 10
            # self-manages: on a mismatch it downloads the pinned version to
            # ~/.local/share/pnpm and runs that instead of this one, quietly
            # putting the package manager outside the nix store. Bumping
            # nixpkgs can move pnpm_10, so re-check both after `nix flake
            # update`.
            pkgs.pnpm_10

            # scripts/check-responsive.mjs drives a real browser over every
            # page, viewport and theme.
            pkgs.chromium

            # Repo, Pages and deploy settings are driven from the CLI.
            pkgs.gh
          ];
        };
      });
    };
}
