import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.stream.Collectors;

public class MyFitServer {

    private static final int PORT = 8080;
    private static final String DATA_DIR = "data";
    private static final String TRAINEES_FILE = DATA_DIR + "/trainees.json";
    private static final String PROGRAMS_FILE = DATA_DIR + "/programs.json";
    private static final String HISTORY_FILE = DATA_DIR + "/history.json";

    public static void main(String[] args) throws IOException {
        System.out.println("Starting MyFit Standalone Server Setup...");

        Files.createDirectories(Paths.get(DATA_DIR));
        ensureFileExists(TRAINEES_FILE, "[]");
        ensureFileExists(PROGRAMS_FILE, "[]");
        ensureFileExists(HISTORY_FILE, "[]");

        // Binding to 0.0.0.0 to ensure it's reachable on all local interfaces
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", PORT), 0);

        server.createContext("/api/trainees", new TraineeHandler());
        server.createContext("/api/programs", new ProgramHandler());
        server.createContext("/api/history", new HistoryHandler());

        server.setExecutor(null);
        System.out.println("========================================");
        System.out.println("SERVER RUNNING ON: http://localhost:" + PORT);
        System.out.println("DATA DIRECTORY: " + Paths.get(DATA_DIR).toAbsolutePath());
        System.out.println("========================================");
        System.out.println("Ready to receive requests...");
        server.start();
    }

    private static void ensureFileExists(String filePath, String content) throws IOException {
        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            System.out.println("Creating data file: " + filePath);
            Files.write(path, content.getBytes(StandardCharsets.UTF_8));
        }
    }

    private static String getRequestBody(HttpExchange exchange) throws IOException {
        InputStream is = exchange.getRequestBody();
        return new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))
                .lines().collect(Collectors.joining("\n"));
    }

    private static void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        // Log outgoing response
        System.out.println("  [Response] Status: " + statusCode + ", Length: " + response.length());

        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");

        byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }

    private static void handleOptions(HttpExchange exchange) throws IOException {
        System.out.println("  [CORS] Handling OPTIONS request");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
    }

    static class TraineeHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            System.out.println("[Request] " + exchange.getRequestMethod() + " " + exchange.getRequestURI());
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                handleOptions(exchange);
                return;
            }

            try {
                if ("GET".equals(exchange.getRequestMethod())) {
                    String trainees = Files.readString(Paths.get(TRAINEES_FILE), StandardCharsets.UTF_8);
                    sendResponse(exchange, 200, trainees);
                } else if ("POST".equals(exchange.getRequestMethod())) {
                    String body = getRequestBody(exchange);
                    String trainee = processJsonPost(TRAINEES_FILE, body);
                    sendResponse(exchange, 200, trainee);
                } else if ("DELETE".equals(exchange.getRequestMethod())) {
                    String path = exchange.getRequestURI().getPath();
                    String id = path.substring(path.lastIndexOf("/") + 1);
                    deleteItem(TRAINEES_FILE, id);
                    sendResponse(exchange, 204, "");
                }
            } catch (Exception e) {
                e.printStackTrace();
                sendResponse(exchange, 500, "{\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    static class ProgramHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            System.out.println("[Request] " + exchange.getRequestMethod() + " " + exchange.getRequestURI());
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                handleOptions(exchange);
                return;
            }

            try {
                String path = exchange.getRequestURI().getPath();
                if ("GET".equals(exchange.getRequestMethod())) {
                    if (path.contains("/trainee/")) {
                        String traineeId = path.substring(path.lastIndexOf("/") + 1);
                        String allPrograms = Files.readString(Paths.get(PROGRAMS_FILE), StandardCharsets.UTF_8);
                        String filtered = filterJsonByField(allPrograms, "traineeId", traineeId);
                        sendResponse(exchange, 200, filtered);
                    } else {
                        String allPrograms = Files.readString(Paths.get(PROGRAMS_FILE), StandardCharsets.UTF_8);
                        sendResponse(exchange, 200, allPrograms);
                    }
                } else if ("POST".equals(exchange.getRequestMethod())) {
                    String body = getRequestBody(exchange);
                    String program = processJsonPost(PROGRAMS_FILE, body);
                    sendResponse(exchange, 200, program);
                } else if ("DELETE".equals(exchange.getRequestMethod())) {
                    String id = path.substring(path.lastIndexOf("/") + 1);
                    deleteItem(PROGRAMS_FILE, id);
                    sendResponse(exchange, 204, "");
                }
            } catch (Exception e) {
                e.printStackTrace();
                sendResponse(exchange, 500, "{\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    static class HistoryHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            System.out.println("[Request] " + exchange.getRequestMethod() + " " + exchange.getRequestURI());
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                handleOptions(exchange);
                return;
            }

            try {
                String path = exchange.getRequestURI().getPath();
                if ("GET".equals(exchange.getRequestMethod())) {
                    String allHistory = Files.readString(Paths.get(HISTORY_FILE), StandardCharsets.UTF_8);
                    if (path.contains("/trainee/")) {
                        String traineeId = path.substring(path.lastIndexOf("/") + 1);
                        String filtered = filterJsonByField(allHistory, "traineeId", traineeId);
                        sendResponse(exchange, 200, filtered);
                    } else {
                        sendResponse(exchange, 200, allHistory);
                    }
                } else if ("POST".equals(exchange.getRequestMethod())) {
                    String body = getRequestBody(exchange);
                    String entry = processJsonPost(HISTORY_FILE, body);
                    sendResponse(exchange, 200, entry);
                }
            } catch (Exception e) {
                e.printStackTrace();
                sendResponse(exchange, 500, "{\"error\":\"" + e.getMessage() + "\"}");
            }
        }
    }

    // --- Minimal JSON Utils ---

    private static synchronized String processJsonPost(String fileName, String body) throws IOException {
        String content = Files.readString(Paths.get(fileName), StandardCharsets.UTF_8).trim();
        if (content.isEmpty() || content.equals("[]")) {
            content = "[]";
        }

        if (!body.contains("\"id\"")) {
            String newId = String.valueOf(System.currentTimeMillis());
            body = body.substring(0, body.lastIndexOf("}")) + ",\"id\":" + newId + "}";
        } else {
            String idStr = extractId(body);
            deleteItem(fileName, idStr);
            content = Files.readString(Paths.get(fileName), StandardCharsets.UTF_8).trim();
        }

        String updated;
        if (content.equals("[]")) {
            updated = "[" + body + "]";
        } else {
            updated = content.substring(0, content.lastIndexOf("]")) + "," + body + "]";
        }
        Files.writeString(Paths.get(fileName), updated, StandardCharsets.UTF_8);
        return body;
    }

    private static synchronized void deleteItem(String fileName, String id) throws IOException {
        String content = Files.readString(Paths.get(fileName), StandardCharsets.UTF_8);
        String idPattern = "\"id\":" + id;
        int idIdx = content.indexOf(idPattern);
        if (idIdx == -1)
            return;

        int start = content.lastIndexOf("{", idIdx);
        int end = content.indexOf("}", idIdx) + 1;

        String before = content.substring(0, start);
        String after = content.substring(end);

        before = before.trim();
        after = after.trim();
        if (before.endsWith(",") && (after.isEmpty() || after.startsWith("]"))) {
            before = before.substring(0, before.length() - 1);
        } else if (before.endsWith("[") && after.startsWith(",")) {
            after = after.substring(1);
        }

        Files.writeString(Paths.get(fileName), before + after, StandardCharsets.UTF_8);
    }

    private static String filterJsonByField(String json, String field, String value) {
        if (json.equals("[]"))
            return "[]";
        String[] items = json.substring(1, json.length() - 1).split("(?<=\\}),(?=\\{)");
        StringBuilder sb = new StringBuilder("[");
        boolean first = true;
        for (String item : items) {
            if (item.contains("\"" + field + "\":" + value) || item.contains("\"" + field + "\":\"" + value + "\"")) {
                if (!first)
                    sb.append(",");
                sb.append(item);
                first = false;
            }
        }
        sb.append("]");
        return sb.toString();
    }

    private static String extractId(String json) {
        int idx = json.indexOf("\"id\":");
        if (idx == -1)
            return null;
        int end = json.indexOf(",", idx);
        if (end == -1)
            end = json.indexOf("}", idx);
        return json.substring(idx + 5, end).trim();
    }
}
