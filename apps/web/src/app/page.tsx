import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainNavLinks } from "@/components/layout/MainNavLinks";
import { ContextSelector } from "@/components/docs/ContextSelector";
import { HighlightedHtml } from "@/components/docs/HighlightedHtml";

export const metadata: Metadata = {
    title: "Aphiria - A simple, extensible REST API framework",
    description: "A simple, extensible REST API framework for PHP",
};

export default function HomePage() {
    return (
        <>
            <Header />
            <main className="home">
                <Sidebar id="sidebar-main-nav">
                    <ContextSelector initialContext="framework" />
                    <ul>
                        <MainNavLinks />
                    </ul>
                </Sidebar>
                <hgroup id="site-slogan">
                    <h1>A simple, extensible REST API framework for PHP</h1>
                    <p>Automatic content negotiation. No magic. No bleeding into your code.</p>
                </hgroup>
                <HighlightedHtml>
                    <pre className="no-copy">
                        <code className="language-php">
                            {`// Define a controller endpoint
class UserController extends Controller
{
    public function __construct(private IUserService $users) {}

    #[Post('/users')]
    public function createUser(User $user): IResponse
    {
        $this->users->create($user);

        return $this->created("/users/{$user->id}", $user);
    }

    #[Get('/users/:id')]
    #[AuthorizeRoles('admin')]
    public function getUserById(int $id): User
    {
        return $this->users->getById($id);
    }
}

// Bind your dependency
$container->bindInstance(IUserService::class, new UserService());

// Run an integration test
$postResponse = $this->post('/users', new User('Dave'));
$user = $this->readResponseBodyAs(User::class, $postResponse);
$admin = new PrincipalBuilder('example.com')
    ->withRoles('admin')
    ->build();
$getResponse = $this->actingAs($admin, fn() => $this->get("/users/$user->id"));
$this->assertParsedBodyEquals($user, $getResponse);`}
                        </code>
                    </pre>
                    <h2>Install Aphiria</h2>
                    <pre className="center">
                        <code className="language-bash">
                            {`composer create-project aphiria/app --prefer-dist --stability dev`}
                        </code>
                    </pre>
                </HighlightedHtml>
                <nav className="doc-short-links-nav">
                    <h2>Get started</h2>
                    <Link
                        className="button"
                        href="/docs/1.x/installation"
                        title="Learn how to install Aphiria"
                    >
                        Installing
                    </Link>
                    <Link
                        className="button"
                        href="/docs/1.x/application-builders"
                        title="Learn how to build your app"
                    >
                        Application Builders
                    </Link>
                    <Link className="button" href="/docs/1.x/routing" title="Learn about routing">
                        Routing
                    </Link>
                    <Link
                        className="button"
                        href="/docs/1.x/controllers"
                        title="Learn how to write controllers"
                    >
                        Controllers
                    </Link>
                    <Link
                        className="button"
                        href="/docs/1.x/dependency-injection"
                        title="Learn about dependency injection"
                    >
                        DI
                    </Link>
                    <Link
                        className="button"
                        href="/docs/1.x/authentication"
                        title="Learn about authentication"
                    >
                        Authentication
                    </Link>
                    <Link
                        className="button"
                        href="/docs/1.x/authorization"
                        title="Learn about authorization"
                    >
                        Authorization
                    </Link>
                </nav>
                <div id="gray-out"></div>
            </main>
            <Footer />
        </>
    );
}
