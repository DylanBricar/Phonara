declare module "@tanstack/react-start/api" {
  type HTTPHandler = (context: {
    request: Request;
  }) => Response | Promise<Response>;

  type HTTPMethods = {
    GET?: HTTPHandler;
    POST?: HTTPHandler;
    PUT?: HTTPHandler;
    DELETE?: HTTPHandler;
    PATCH?: HTTPHandler;
    HEAD?: HTTPHandler;
    OPTIONS?: HTTPHandler;
  };

  export function createAPIFileRoute(
    path: string,
  ): (methods: HTTPMethods) => void;
}
