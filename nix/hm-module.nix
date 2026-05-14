# Home-manager module for Phonara speech-to-text
#
# Provides a systemd user service for autostart.
# Usage: imports = [ phonara.homeManagerModules.default ];
#        services.phonara.enable = true;
{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.services.phonara;
in
{
  options.services.phonara = {
    enable = lib.mkEnableOption "Phonara speech-to-text user service";

    package = lib.mkOption {
      type = lib.types.package;
      defaultText = lib.literalExpression "phonara.packages.\${system}.phonara";
      description = "The Phonara package to use.";
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.user.services.phonara = {
      Unit = {
        Description = "Phonara speech-to-text";
        After = [ "graphical-session.target" ];
        PartOf = [ "graphical-session.target" ];
      };
      Service = {
        ExecStart = "${cfg.package}/bin/phonara";
        Restart = "on-failure";
        RestartSec = 5;
      };
      Install.WantedBy = [ "graphical-session.target" ];
    };
  };
}
